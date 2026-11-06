// Summary storage. Local development keeps summaries in a JSON file under .local-data/ (synthetic
// data only); deployed stacks use the DynamoDB records table (summary/dynamo.ts) behind the same
// interface. Each summary records whether the weekly report covered it, so summaries never need a
// finer date than the month.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import type { Summary } from './types.ts';
import { reviewFlags } from './summarizer.ts';

export interface StoredSummary {
  summary: Summary;
  reportedWeekly: boolean;
}

export interface SummaryRepo {
  add(summary: Summary): Promise<void>;
  inMonth(month: string): Promise<Summary[]>;
  unreported(): Promise<StoredSummary[]>;
  markReported(items: StoredSummary[]): Promise<void>;
  // Demo client only: start with synthetic summaries so the report has something to show.
  seedDemo(seedFile: string, clientId: string, month: string): Promise<number>;
}

export const LOCAL_DATA_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../.local-data');

export function readSeeds(seedFile: string, clientId: string, month: string): Summary[] {
  if (!existsSync(seedFile)) return [];
  return (JSON.parse(readFileSync(seedFile, 'utf8')) as Partial<Summary>[]).map((s) => {
    const summary = withDefaults(s, clientId, month);
    return { ...summary, review_flags: reviewFlags(summary) };
  });
}

export class FileSummaryRepo implements SummaryRepo {
  private items: StoredSummary[] = [];

  constructor(private readonly file?: string) {
    if (file && existsSync(file)) this.items = JSON.parse(readFileSync(file, 'utf8')) as StoredSummary[];
  }

  static forClient(clientId: string): FileSummaryRepo {
    return new FileSummaryRepo(join(LOCAL_DATA_DIR, `summaries-${clientId}.json`));
  }

  async add(summary: Summary, reportedWeekly = false) {
    this.items.push({ summary, reportedWeekly });
    this.save();
  }

  async inMonth(month: string) {
    return this.items.filter((i) => i.summary.month === month).map((i) => i.summary);
  }

  async unreported() {
    return this.items.filter((i) => !i.reportedWeekly);
  }

  async markReported(items: StoredSummary[]) {
    const ids = new Set(items.map((i) => i.summary.conversation_id));
    for (const i of this.items) if (ids.has(i.summary.conversation_id)) i.reportedWeekly = true;
    this.save();
  }

  async seedDemo(seedFile: string, clientId: string, month: string) {
    if (this.items.length) return 0;
    const seeds = readSeeds(seedFile, clientId, month);
    for (const summary of seeds) this.items.push({ summary, reportedWeekly: false });
    this.save();
    return seeds.length;
  }

  private save(): void {
    if (!this.file) return;
    mkdirSync(dirname(this.file), { recursive: true });
    writeFileSync(this.file, JSON.stringify(this.items, null, 1), { mode: 0o600 });
  }
}

function withDefaults(s: Partial<Summary>, clientId: string, month: string): Summary {
  return {
    conversation_id: randomUUID(),
    client_id: clientId,
    month,
    day_of_week: 'fri',
    local_hour: 19,
    after_hours: false,
    language: 'en',
    display_mode: 'inline',
    booking_mode: 'link_handoff',
    topics: [],
    service_categories_discussed: [],
    outcome: 'answered',
    abandon_point: null,
    unanswered_questions: [],
    requested_services_not_offered: [],
    promotions_mentioned: [],
    upsell_offered: false,
    upsell_accepted: false,
    handoff_reason_category: null,
    output_check_fallbacks: 0,
    feedback_up: 0,
    feedback_down: 0,
    feedback_reasons: [],
    free_text_dropped: false,
    message_count: 4,
    tokens_in: 12000,
    tokens_out: 900,
    duration_seconds: 240,
    scores: null,
    review_flags: [],
    ...s,
  };
}
