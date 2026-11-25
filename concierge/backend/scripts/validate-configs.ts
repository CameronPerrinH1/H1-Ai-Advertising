// Loads every client folder the way the server does, so a bad config fails the build instead of a deploy.
//   pnpm --filter @concierge/backend check:configs
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { CLIENTS_DIR, loadClient } from '../src/config/load.ts';
import { Catalog } from '../src/catalog.ts';

const ids = readdirSync(CLIENTS_DIR).filter((d) => statSync(join(CLIENTS_DIR, d)).isDirectory());
let failed = 0;
for (const id of ids) {
  try {
    const catalog = new Catalog(loadClient(id));
    console.log(`  ok  ${id} (${catalog.services.size} services)`);
  } catch (err) {
    failed += 1;
    console.error(`  FAIL ${id}: ${(err as Error).message}`);
  }
}
if (failed) process.exit(1);
console.log(`Client configs valid (${ids.length}).`);
