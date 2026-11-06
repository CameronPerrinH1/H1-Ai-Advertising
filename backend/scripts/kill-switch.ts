// Kill switch (D43, build plan 12.6): pause or resume the chat without a redeploy.
//   pnpm kill-switch on | off | status
// Locally this flips .local-data/control-<client>.json. For a deployed stack, set the parameter
// name the stack outputs (ops role credentials required):
//   CONCIERGE_CONTROL_PARAM=/concierge/glow-med-spa/chat pnpm kill-switch on
import { controlFromEnv } from '../src/control.ts';

const clientId = process.env.CLIENT_ID ?? 'glow-med-spa';
const control = controlFromEnv(clientId);
const where = process.env.CONCIERGE_CONTROL_PARAM ?? `local (${clientId})`;
const command = process.argv[2];

if (command === 'on') {
  await control.setPaused(true);
  console.log(`Chat paused: ${where}. Visitors see "Chat is unavailable" with the phone number and booking link within a minute.`);
} else if (command === 'off') {
  await control.setPaused(false);
  console.log(`Chat resumed: ${where}.`);
} else if (command === 'status') {
  console.log(`${where}: ${(await control.paused()) ? 'paused' : 'running'}`);
} else {
  console.error('Usage: pnpm kill-switch on | off | status');
  process.exit(1);
}
