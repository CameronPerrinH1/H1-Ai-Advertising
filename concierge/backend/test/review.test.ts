import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { maskContacts, review } from '../src/review.ts';
import { MemorySessionRepo } from '../src/session/store.ts';
import type { ReviewMarks } from '../src/session/store.ts';

process.env.CONCIERGE_SILENT = '1';

const SCORES = { answered: 2, next_step: null, objections: null, tone: 4, safety: 5, overall: 3 };
const FLAGGED: ReviewMarks = { flags: ['thumbs_down', 'low_score'], scores: SCORES };

// A chat with contact details in the guest's messages and on a confirmation card.
async function chat(sessions: MemorySessionRepo, text = 'Is Botox painful?') {
  const { token, session } = await sessions.create({ lang: 'en', noticeVersion: 'v1' });
  session.display.push(
    { role: 'guest', text },
    { role: 'assistant', replyId: 'abcdef0123456789', text: 'Most guests feel a quick pinch.', feedback: { rating: 'down', reason: 'wrong_info' } },
    { role: 'guest', text: "I'm Jane Doe, call me at (503) 555-0142 or jane.doe@example.com" },
    {
      role: 'assistant',
      text: 'Here is your callback request.',
      cards: [
        {
          type: 'confirm',
          actionId: 'a1',
          kind: 'callback',
          fields: [
            { key: 'name', value: 'Jane Doe' },
            { key: 'phone', value: '+15035550142' },
            { key: 'email', value: 'jane.doe@example.com' },
          ],
          note: 'The team will call you.',
          status: 'confirmed',
        },
      ],
    },
  );
  await sessions.save(session);
  await sessions.end(token);
  return session;
}

describe('review function (D39, D69)', () => {
  it('returns flagged chats only', async () => {
    const sessions = new MemorySessionRepo();
    const flagged = await chat(sessions, 'Flagged chat');
    const clean = await chat(sessions, 'Clean chat');
    const ended = await chat(sessions, 'Ended, not yet summarized');
    const { session: open } = await sessions.create({ lang: 'en', noticeVersion: 'v1' });
    await sessions.markSummarized(flagged, FLAGGED);
    await sessions.markSummarized(clean, { flags: [], scores: { ...SCORES, answered: 5, overall: 5 } });

    const { chats } = await review(sessions, { action: 'list' });
    expect(chats).toEqual([{ id: flagged.hash, flags: ['thumbs_down', 'low_score'], scores: SCORES, date: expect.stringMatching(/^\d{4}-\d\d-\d\d \d\d:00 UTC$/) }]);
    expect(await review(sessions, { action: 'get', id: flagged.hash })).toMatchObject({ id: flagged.hash, lang: 'en' });
    for (const other of [clean, ended, open]) expect(await review(sessions, { action: 'get', id: other.hash })).toBeNull();
    expect(await review(sessions, { action: 'get', id: 'not-a-chat' })).toBeNull();
  });

  it('masks contact details in messages and leaves confirmation card fields out', async () => {
    const sessions = new MemorySessionRepo();
    const session = await chat(sessions);
    await sessions.markSummarized(session, FLAGGED);

    const got = await review(sessions, { action: 'get', id: session.hash });
    expect(got!.messages).toEqual([
      { role: 'guest', text: 'Is Botox painful?', cards: [] },
      { role: 'assistant', text: 'Most guests feel a quick pinch.', cards: [], feedback: 'down (wrong_info)' },
      { role: 'guest', text: "I'm Jane Doe, call me at [phone] or [email]", cards: [] },
      { role: 'assistant', text: 'Here is your callback request.', cards: ['callback request (confirmed)'] },
    ]);
    const all = JSON.stringify(got);
    for (const detail of ['555-0142', '5035550142', 'jane.doe@example.com', 'example.com']) expect(all).not.toContain(detail);
  });

  it('masks common phone and email formats', () => {
    for (const phone of ['503-555-0142', '(503) 555-0142', '503.555.0142', '5035550142', '+1 503 555 0142', '+15035550142', '1-503-555-0142']) {
      expect(maskContacts(`call ${phone} today`)).toBe('call [phone] today');
    }
    expect(maskContacts('write to j.doe+spa@mail.example.co')).toBe('write to [email]');
    expect(maskContacts('Botox is $12 a unit, 20 units, at 9:30 on 10/28')).toBe('Botox is $12 a unit, 20 units, at 9:30 on 10/28');
  });

  it('keeps flagged chats in the local file for pnpm review, until the flagged retention ends', async () => {
    const file = join(mkdtempSync(join(tmpdir(), 'concierge-')), 'flagged.json');
    const writer = new MemorySessionRepo({ file, flaggedDays: 90 });
    const recent = await chat(writer, 'Recent');
    const old = await chat(writer, 'Old');
    await writer.markSummarized(recent, FLAGGED);
    old.lastActivity = Date.now() - 91 * 86_400_000;
    await writer.markSummarized(old, { flags: ['urgent'], scores: null });

    const reader = new MemorySessionRepo({ file, flaggedDays: 90 });
    expect((await review(reader, { action: 'list' })).chats.map((c) => c.id)).toEqual([recent.hash]);
    expect((await review(reader, { action: 'get', id: recent.hash }))!.messages[0]!.text).toBe('Recent');
    expect(await reader.get(undefined)).toBeUndefined();
  });
});
