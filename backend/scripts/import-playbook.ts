// Imports an intake playbook into a client folder (09-intake-wizard.md, Section 5).
//   pnpm import-playbook <playbook.json> <client id>      (from concierge/)
//
// The playbook comes from H1's site: pnpm --filter site-h1 export-playbook <spa id> <out.json>.
// The client folder must already hold H1's business facts (copy an existing client to start).
// The result is checked with the same loader the concierge runs on, in a copy first, so a
// playbook that doesn't fit leaves the folder untouched. Review the change as a pull request.
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { CLIENTS_DIR, ConfigError, loadClient } from '../src/config/load.ts';
import { applyPlaybook, PlaybookError } from '../src/intake/apply.ts';
import { playbookSchema } from '../src/intake/playbook.ts';

const [file, clientId] = process.argv.slice(2);
if (!file || !clientId) {
  console.log('Usage: import-playbook <playbook.json> <client id>');
  process.exit(1);
}

const parsed = playbookSchema.safeParse(JSON.parse(readFileSync(resolve(process.env.INIT_CWD ?? process.cwd(), file), 'utf8')));
if (!parsed.success) {
  console.error(`Not a playbook this importer reads:\n${parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n')}`);
  process.exit(1);
}

const dir = join(CLIENTS_DIR, clientId);
try {
  const { files, warnings } = applyPlaybook(parsed.data, dir);

  // Check in a copy, then write.
  const scratch = mkdtempSync(join(tmpdir(), 'playbook-'));
  cpSync(dir, join(scratch, clientId), { recursive: true });
  for (const [name, text] of Object.entries(files)) writeFileSync(join(scratch, clientId, name), text);
  const bundle = loadClient(clientId, scratch);
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);

  console.log(`Imported the playbook for ${parsed.data.spa.name} into clients/${clientId}: ${bundle.services.services.length} treatments, ${bundle.config.sales.promotions.length} promotions, ${bundle.config.sales.events.length} events, ${bundle.concerns.concerns.length} concerns.`);
  if (warnings.length) console.log(`\nTo review:\n${warnings.map((w) => `  - ${w}`).join('\n')}`);
  console.log('\nNext: pnpm check, then the evals (EVAL_SUITE=playbook for the demo spa).');
} catch (err) {
  if (err instanceof PlaybookError || err instanceof ConfigError) {
    console.error(`Not imported; clients/${clientId} is unchanged:\n${err.message.split(/\n|; /).map((l) => `  - ${l}`).join('\n')}`);
    process.exit(1);
  }
  throw err;
}
