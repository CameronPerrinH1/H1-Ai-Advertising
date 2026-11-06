// Ends idle sessions and writes the summary for every ended one (build plan 7.3, D32). Locally the
// server runs this every minute; deployed, a scheduled Lambda runs it every five minutes.
import type { Catalog } from '../catalog.ts';
import type { ModelClient } from '../model/bedrock.ts';
import type { SummaryRepo } from '../summary/store.ts';
import { summarize } from '../summary/summarizer.ts';
import { log } from '../log.ts';
import type { ReviewMarks, SessionRepo } from './store.ts';

const BATCH = 25;

export async function sweep(deps: { sessions: SessionRepo; summaries: SummaryRepo; catalog: Catalog; model: ModelClient }): Promise<number> {
  const idle = await deps.sessions.endIdle(Date.now());
  let done = 0;
  for (const s of await deps.sessions.ended(BATCH)) {
    let review: ReviewMarks = { flags: [], scores: null };
    try {
      const summary = await summarize(s, deps.catalog, deps.model);
      if (summary) {
        await deps.summaries.add(summary);
        review = { flags: summary.review_flags, scores: summary.scores };
        log('summary_saved', { session: s.hash.slice(0, 8), status: summary.outcome, count: review.flags.length });
      }
    } catch (err) {
      // Logged and moved on: one bad session mustn't block every summary behind it.
      log('summary_failed', { session: s.hash.slice(0, 8), error: (err as Error)?.name ?? 'Error' });
    }
    await deps.sessions.markSummarized(s, review);
    done += 1;
  }
  if (idle) log('sessions_idle_ended', { count: idle });
  if (done) log('sweep_done', { count: done });
  return done;
}
