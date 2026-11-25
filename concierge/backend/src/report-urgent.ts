// Prints the yearly count of help messages shown (D14) for Colorado HB26-1263's yearly report to the
// Attorney General (first due July 1, 2027). Counts only, never chat content.
//   pnpm report:urgent          (this year)
//   pnpm report:urgent 2026     (a given year)
import { createRuntime } from './runtime.ts';

const year = process.argv[2] ?? String(new Date().getFullYear());
if (!/^\d{4}$/.test(year)) throw new Error('Give the year as four digits, for example: pnpm report:urgent 2026');
const rt = await createRuntime();
const t = await rt.summaries.urgentTally(year);
const lines = [`${rt.catalog.config.business.name}, ${year}`, `  Crisis referrals (988): ${t.crisis}`, `  Emergency (911): ${t.emergency}`, `  Post-treatment urgent line: ${t.post_treatment}`];
console.log(lines.join('\n')); // log-guard: allow (command-line output, counts only)
