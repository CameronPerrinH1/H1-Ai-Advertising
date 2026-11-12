// Session storage. Local development keeps sessions in memory (and flagged chats in a file under
// .local-data/, so `pnpm review` can read them); deployed stacks use the DynamoDB ephemeral table
// (session/dynamo.ts) behind the same interface. Sessions are keyed by a hash of
// the token, never the token itself (D30), and end after 30 minutes of inactivity.
//
// A session is open while the visitor is chatting, ended once they click End chat or go idle, and
// summarized by the sweep (session/sweep.ts), which then drops it from the open/ended lists. The
// transcript itself stays until it expires: 30 days, or 90 if the chat was flagged for review (D31, D69).
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Message } from '@aws-sdk/client-bedrock-runtime';
import type { DisplayMessage, DisplayMode, Lang } from '@concierge/shared';
import type { ReviewFlag, Scores } from '../summary/types.ts';
import { decodeSession, encodeSession } from './codec.ts';

export const IDLE_MS = 30 * 60 * 1000;

export interface AppointmentPayload {
  serviceIds: string[]; // more than one when requesting a countdown plan
  staffId?: string;
  preferredTimes: string;
  firstName: string;
  lastName: string;
  phone: string; // E.164
  email?: string;
  // A time picked from the openings shown in this chat. With holds on, Confirm blocks it on the
  // provider's calendar before the request is emailed.
  hold?: { serviceId: string; date: string; start: string; end: string; providerId?: string; label: string };
}

export interface CallbackPayload {
  firstName: string;
  phone: string; // E.164
  preferredTime?: string;
  category: string;
}

export type PendingAction =
  | { id: string; kind: 'appointment'; payload: AppointmentPayload; createdAt: number; status: 'pending' | 'confirmed' | 'expired' }
  | { id: string; kind: 'callback'; payload: CallbackPayload; createdAt: number; status: 'pending' | 'confirmed' | 'expired' };

export interface ShownSlot {
  serviceId: string; // the chat's id for the treatment (or consultation) the openings were for
  date: string; // YYYY-MM-DD, local
  time: string; // HH:mm, local
  providerId?: string; // the platform's provider id
  minutes?: number; // the platform's booking block
}

export interface Session {
  hash: string;
  audience: 'guest' | 'staff'; // staff mode is the team assistant (D64)
  displayMode?: DisplayMode;
  createdAt: number;
  lastActivity: number;
  lang: Lang;
  page?: string;
  noticeVersion: string;
  lastPlan?: { label: string; eventDate: string; items: { serviceId: string; date: string }[] };
  tokens: { in: number; out: number };
  modelMessages: Message[];
  display: DisplayMessage[];
  pendingActions: Map<string, PendingAction>;
  events: string[]; // told to the model at the start of the next turn
  // Times show_openings offered in this chat; a hold may only be placed on one of them (D11).
  shownSlots?: ShownSlot[];
  askedTimes?: boolean; // the chat was told to ask the guest's days and times before showing openings
  counts: { messages: number; requests: number; callbacks: number; fallbacks: number; openings?: number }; // openings: availability searches (D22)
  phoneHashes: Set<string>; // lets a deletion request find this session (7.2)
  seenMessageIds: Set<string>;
  promotionsMentioned: Set<string>;
  outcomes: Set<string>; // link_provided, handoff, request, urgent_redirect
  busy: boolean;
}

export type SessionInit = { lang: Lang; noticeVersion: string; page?: string; audience?: 'guest' | 'staff'; displayMode?: DisplayMode };

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// A new session and the token for its cookie. Stores call this; tests and evals use it directly.
export function createSession(init: SessionInit): { token: string; session: Session } {
  const token = randomBytes(32).toString('base64url');
  const now = Date.now();
  return {
    token,
    session: {
      hash: hashToken(token),
      audience: init.audience ?? 'guest',
      displayMode: init.displayMode,
      createdAt: now,
      lastActivity: now,
      lang: init.lang,
      page: init.page,
      noticeVersion: init.noticeVersion,
      tokens: { in: 0, out: 0 },
      modelMessages: [],
      display: [],
      pendingActions: new Map(),
      events: [],
      counts: { messages: 0, requests: 0, callbacks: 0, fallbacks: 0 },
      phoneHashes: new Set(),
      seenMessageIds: new Set(),
      promotionsMentioned: new Set(),
      outcomes: new Set(),
      busy: false,
    },
  };
}

export interface SessionRepo {
  create(init: SessionInit): Promise<{ token: string; session: Session }>;
  // The open session for this cookie, or undefined if it ended, went idle, or never existed.
  get(token: string | undefined): Promise<Session | undefined>;
  // Claims the session for one request, so two requests can't both change it. False if it's in use.
  lock(session: Session): Promise<boolean>;
  // Stores the changes, marks activity, and releases the lock.
  save(session: Session): Promise<void>;
  end(token: string | undefined): Promise<void>;
  // Marks open sessions idle past IDLE_MS as ended. Returns how many.
  endIdle(now: number): Promise<number>;
  // Ended sessions waiting for their summary, oldest first.
  ended(limit: number): Promise<Session[]>;
  // Done with the sweep. A chat with review flags is kept longer and listed for review (D69).
  markSummarized(session: Session, review: ReviewMarks): Promise<void>;
  // Review function only (D39, D69): flagged chats still within their retention, newest first.
  listFlagged(limit: number): Promise<FlaggedChat[]>;
  getFlagged(id: string): Promise<(FlaggedChat & { session: Session }) | undefined>;
}

export interface ReviewMarks {
  flags: ReviewFlag[];
  scores: Scores | null;
}

export interface FlaggedChat extends ReviewMarks {
  id: string; // the session's key; can't be turned back into the visitor's cookie
  lastActivity: number;
}

type State = 'open' | 'ended' | 'summarized';
type StoredFlagged = { data: string; review: ReviewMarks }; // data: the session in the stored format, base64

export class MemorySessionRepo implements SessionRepo {
  private sessions = new Map<string, { session: Session; state: State; lockedUntil: number; review?: ReviewMarks }>();

  // With a file, flagged chats are also kept there (synthetic local chats only) and expire after
  // flaggedDays, like the table's TTL.
  constructor(private readonly flagged?: { file: string; flaggedDays: number }) {
    if (!flagged || !existsSync(flagged.file)) return;
    for (const item of JSON.parse(readFileSync(flagged.file, 'utf8')) as StoredFlagged[]) {
      const session = decodeSession(Buffer.from(item.data, 'base64'));
      this.sessions.set(session.hash, { session, state: 'summarized', lockedUntil: 0, review: item.review });
    }
    this.saveFlagged();
  }

  async create(init: SessionInit) {
    const created = createSession(init);
    this.sessions.set(created.session.hash, { session: created.session, state: 'open', lockedUntil: 0 });
    return created;
  }

  async get(token: string | undefined) {
    const entry = token ? this.sessions.get(hashToken(token)) : undefined;
    if (!entry || entry.state !== 'open' || Date.now() - entry.session.lastActivity > IDLE_MS) return undefined;
    return entry.session;
  }

  async lock(session: Session) {
    const entry = this.sessions.get(session.hash);
    if (!entry || entry.lockedUntil > Date.now()) return false;
    entry.lockedUntil = Date.now() + 60_000;
    return true;
  }

  async save(session: Session) {
    const entry = this.sessions.get(session.hash);
    if (!entry) return;
    session.lastActivity = Date.now();
    entry.lockedUntil = 0;
  }

  async end(token: string | undefined) {
    const entry = token ? this.sessions.get(hashToken(token)) : undefined;
    if (entry?.state === 'open') entry.state = 'ended';
  }

  async endIdle(now: number) {
    let n = 0;
    for (const entry of this.sessions.values()) {
      if (entry.state === 'open' && now - entry.session.lastActivity > IDLE_MS) {
        entry.state = 'ended';
        n += 1;
      }
    }
    return n;
  }

  async ended(limit: number) {
    return [...this.sessions.values()]
      .filter((e) => e.state === 'ended')
      .sort((a, b) => a.session.lastActivity - b.session.lastActivity)
      .slice(0, limit)
      .map((e) => e.session);
  }

  async markSummarized(session: Session, review: ReviewMarks) {
    // Locally, flagged chats stay in memory for review; the rest go once they're summarized.
    const entry = this.sessions.get(session.hash);
    if (!entry) return;
    if (!review.flags.length) return void this.sessions.delete(session.hash);
    entry.state = 'summarized';
    entry.review = review;
    this.saveFlagged();
  }

  private saveFlagged(): void {
    if (!this.flagged) return;
    const cutoff = Date.now() - this.flagged.flaggedDays * 86_400_000;
    for (const [hash, e] of this.sessions) if (e.review && e.session.lastActivity < cutoff) this.sessions.delete(hash);
    const items: StoredFlagged[] = [...this.sessions.values()]
      .filter((e) => e.review?.flags.length)
      .map((e) => ({ data: Buffer.from(encodeSession(e.session)).toString('base64'), review: e.review! }));
    mkdirSync(dirname(this.flagged.file), { recursive: true });
    writeFileSync(this.flagged.file, JSON.stringify(items), { mode: 0o600 });
  }

  async listFlagged(limit: number) {
    return [...this.sessions.values()]
      .filter((e) => e.review?.flags.length)
      .sort((a, b) => b.session.lastActivity - a.session.lastActivity)
      .slice(0, limit)
      .map((e) => ({ id: e.session.hash, lastActivity: e.session.lastActivity, ...e.review! }));
  }

  async getFlagged(id: string) {
    const e = this.sessions.get(id);
    return e?.review?.flags.length ? { id, lastActivity: e.session.lastActivity, ...e.review, session: e.session } : undefined;
  }

  get size(): number {
    return this.sessions.size;
  }
}
