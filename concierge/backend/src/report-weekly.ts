// Writes the weekly "questions Ava couldn't answer" email (D65) from the local summaries file into
// .outbox/. Deployed stacks run the same report on a schedule (lambda.ts) and send it through SES.
//   pnpm report:weekly
import { createRuntime } from './runtime.ts';
import { weeklyReport } from './summary/insights.ts';

const rt = await createRuntime();
const report = await weeklyReport(rt.catalog, rt.summaries);
if (!report) {
  console.log('No new conversations since the last weekly report.'); // log-guard: allow (command-line output, no guest content)
} else {
  await rt.outbox.send(report.email);
  await rt.summaries.markReported(report.covered);
  console.log(`Weekly report written to .outbox/ (${report.covered.length} conversations).`); // log-guard: allow (command-line output, a count only)
}
