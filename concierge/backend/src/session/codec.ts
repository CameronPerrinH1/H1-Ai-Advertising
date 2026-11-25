// The stored form of a session: gzipped JSON, with sets and maps as arrays. The DynamoDB table and
// the local flagged-chats file (store.ts) both keep sessions this way.
import { gunzipSync, gzipSync } from 'node:zlib';
import type { Message } from '@aws-sdk/client-bedrock-runtime';
import type { Session } from './store.ts';

type Stored = Omit<Session, 'pendingActions' | 'phoneHashes' | 'seenMessageIds' | 'promotionsMentioned' | 'outcomes' | 'busy'> & {
  pendingActions: [string, unknown][];
  phoneHashes: string[];
  seenMessageIds: string[];
  promotionsMentioned: string[];
  outcomes: string[];
};

export function encodeSession(s: Session): Uint8Array {
  const { busy: _busy, ...rest } = s;
  const stored: Stored = {
    ...rest,
    // Reasoning blocks are already dropped from history (normalizeHistory); this keeps any binary out.
    modelMessages: s.modelMessages.map((m) => ({ ...m, content: (m.content ?? []).filter((b) => !b.reasoningContent) })) as Message[],
    pendingActions: [...s.pendingActions.entries()],
    phoneHashes: [...s.phoneHashes],
    seenMessageIds: [...s.seenMessageIds].slice(-50),
    promotionsMentioned: [...s.promotionsMentioned],
    outcomes: [...s.outcomes],
  };
  return gzipSync(JSON.stringify(stored));
}

export function decodeSession(data: Uint8Array): Session {
  const s = JSON.parse(gunzipSync(data).toString('utf8')) as Stored;
  return {
    ...s,
    pendingActions: new Map(s.pendingActions) as Session['pendingActions'],
    phoneHashes: new Set(s.phoneHashes),
    seenMessageIds: new Set(s.seenMessageIds),
    promotionsMentioned: new Set(s.promotionsMentioned),
    outcomes: new Set(s.outcomes),
    busy: false,
  };
}
