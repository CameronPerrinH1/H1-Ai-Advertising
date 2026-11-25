// The review function (D39, D69): after a client's first 30 days, the only way the review role reads
// chats. It returns flagged chats and nothing else, with contact details removed (the minimum a
// reviewer needs to judge an answer), and logs every use. Staff chats are never summarized, so
// they're never flagged and never appear here.
import type { Card } from '@concierge/shared';
import type { FlaggedChat, SessionRepo } from './session/store.ts';
import { log } from './log.ts';

export type ReviewRequest = { action: 'list'; limit?: number } | { action: 'get'; id: string };

export interface ReviewMessage {
  role: 'guest' | 'assistant';
  text: string;
  cards: string[]; // what was shown, by kind; contact details are never included
  feedback?: string;
}

export interface ReviewListItem extends Omit<FlaggedChat, 'lastActivity'> {
  date: string; // date and hour, UTC
}

export interface ReviewedChat extends ReviewListItem {
  lang: string;
  messages: ReviewMessage[];
}

const PHONE = /(?<!\d)(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}(?!\d)/g;
const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
export const maskContacts = (text: string) => text.replace(EMAIL, '[email]').replace(PHONE, '[phone]');

const when = (ms: number) => new Date(ms).toISOString().slice(0, 13).replace('T', ' ') + ':00 UTC';

function describe(card: Card): string {
  switch (card.type) {
    case 'confirm':
      return `${card.kind} request (${card.status})`; // the card's name, phone, and times stay out
    case 'urgent':
      return `urgent help (${card.kind})`;
    case 'service':
    case 'care_guide':
      return `${card.type.replace('_', ' ')}: ${card.service.name}`;
    case 'treatment_options':
      return `options: ${card.items.map((i) => i.service.name).join(', ')}`;
    case 'event_plan':
      return `countdown: ${card.items.map((i) => i.service.name).join(', ')}`;
    case 'compare':
      return `compare: ${card.services.map((s) => s.name).join(' vs ')}`;
    default:
      return card.type.replace('_', ' ');
  }
}

export async function review(sessions: SessionRepo, req: Extract<ReviewRequest, { action: 'list' }>): Promise<{ chats: ReviewListItem[] }>;
export async function review(sessions: SessionRepo, req: Extract<ReviewRequest, { action: 'get' }>): Promise<ReviewedChat | null>;
export async function review(sessions: SessionRepo, req: ReviewRequest): Promise<{ chats: ReviewListItem[] } | ReviewedChat | null>;
export async function review(sessions: SessionRepo, req: ReviewRequest): Promise<{ chats: ReviewListItem[] } | ReviewedChat | null> {
  if (req.action === 'list') {
    const chats = await sessions.listFlagged(Math.min(Math.max(req.limit ?? 50, 1), 200));
    log('review_access', { status: 'list', count: chats.length });
    return { chats: chats.map(({ lastActivity, ...c }) => ({ ...c, date: when(lastActivity) })) };
  }
  const found = await sessions.getFlagged(req.id);
  log('review_access', { session: req.id.slice(0, 8), status: found ? 'get' : 'not_found' });
  if (!found) return null;
  const { session, lastActivity, ...marks } = found;
  return {
    ...marks,
    date: when(lastActivity),
    lang: session.lang,
    messages: session.display.map((m) => ({
      role: m.role,
      text: maskContacts(m.text),
      cards: (m.cards ?? []).map(describe),
      ...(m.feedback ? { feedback: m.feedback.reason ? `${m.feedback.rating} (${m.feedback.reason})` : m.feedback.rating } : {}),
    })),
  };
}
