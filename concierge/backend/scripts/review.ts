// Local review (D39, D69): read flagged chats while testing, through the same review function the
// deployed review role calls.
//   pnpm review list
//   pnpm review show <id>      (the full id, or the first characters shown by list)
// Reads .local-data/flagged-<client>.json, which the local API writes when the sweep flags a chat
// (End chat, then wait up to a minute). Deployed stacks are reviewed by invoking the ReviewFunction
// the stack outputs, under the review role.
import { join } from 'node:path';
import { CLIENTS_DIR, loadClient } from '../src/config/load.ts';
import { review } from '../src/review.ts';
import { MemorySessionRepo } from '../src/session/store.ts';
import { LOCAL_DATA_DIR } from '../src/summary/store.ts';
import { SCORE_KEYS, type Scores } from '../src/summary/types.ts';

const clientId = process.env.CLIENT_ID ?? 'glow-med-spa';
const { retention } = loadClient(clientId, process.env.CONCIERGE_CLIENTS_DIR ?? CLIENTS_DIR).config;
const sessions = new MemorySessionRepo({ file: join(LOCAL_DATA_DIR, `flagged-${clientId}.json`), flaggedDays: retention.flagged_transcripts_days });
const [command, id] = process.argv.slice(2);

const scoreLine = (s: Scores | null) =>
  s ? [`overall ${s.overall}`, ...SCORE_KEYS.flatMap((k) => (s[k] === null ? [] : [`${k} ${s[k]}`]))].join(', ') : 'not scored';

if (command === 'list') {
  const { chats } = await review(sessions, { action: 'list', limit: 200 });
  if (!chats.length) {
    console.log(`No flagged chats for ${clientId}. Chats are flagged by the sweep after they end (End chat, then up to a minute).`);
  } else {
    console.log(`${chats.length} flagged chat${chats.length === 1 ? '' : 's'} for ${clientId}, newest first:\n`);
    for (const c of chats) console.log(`  ${c.id.slice(0, 12)}  ${c.date}  ${c.flags.join(', ')}  (${c.scores ? `overall ${c.scores.overall}` : 'not scored'})`);
    console.log('\nRead one with: pnpm review show <id>');
  }
} else if (command === 'show' && id) {
  // Accept the short id that list prints.
  const { chats } = await review(sessions, { action: 'list', limit: 200 });
  const matches = chats.filter((c) => c.id.startsWith(id));
  if (matches.length > 1) {
    console.error(`"${id}" matches ${matches.length} chats; use more characters.`);
    process.exit(1);
  }
  const chat = await review(sessions, { action: 'get', id: matches[0]?.id ?? id });
  if (!chat) {
    console.error(`No flagged chat ${id}. Run pnpm review list.`);
    process.exit(1);
  }
  console.log(`Chat ${chat.id.slice(0, 12)}  ${chat.date}  ${chat.lang}`);
  console.log(`Flags:  ${chat.flags.join(', ')}`);
  console.log(`Scores: ${scoreLine(chat.scores)}\n`);
  for (const m of chat.messages) {
    console.log(`${m.role === 'guest' ? 'Guest' : 'Concierge'}: ${m.text}`);
    if (m.cards.length) console.log(`  [cards: ${m.cards.join('; ')}]`);
    if (m.feedback) console.log(`  [feedback: ${m.feedback}]`);
    console.log('');
  }
} else {
  console.error('Usage: pnpm review list | pnpm review show <id>');
  process.exit(1);
}
