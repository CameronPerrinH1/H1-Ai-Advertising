import { describe, expect, it } from 'vitest';
import { genericTextOk } from '../src/summary/validate.ts';
import { countText, insightsCard, weeklyReport } from '../src/summary/insights.ts';
import { FileSummaryRepo } from '../src/summary/store.ts';
import { reviewFlags, summarize } from '../src/summary/summarizer.ts';
import type { Summary } from '../src/summary/types.ts';
import { catalog, newSession, scriptedModel, text } from './helpers.ts';

function summary(over: Partial<Summary>): Summary {
  return {
    conversation_id: 'c',
    client_id: 'glow-med-spa',
    month: '2026-10',
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
    tokens_in: 0,
    tokens_out: 0,
    duration_seconds: 300,
    scores: null,
    review_flags: [],
    ...over,
  };
}

describe('summary free text (D32)', () => {
  it('keeps generic FAQ wording and rejects personal or health details', () => {
    expect(genericTextOk('Do you offer financing?')).toBe(true);
    expect(genericTextOk('Can I get Botox while pregnant?')).toBe(false);
    expect(genericTextOk('Is it safe with blood thinners?')).toBe(false);
    expect(genericTextOk('Call 503-555-0142 about it')).toBe(false);
    expect(genericTextOk('Open on 12/24?')).toBe(false);
    expect(genericTextOk('ok')).toBe(false);
  });

  it('retries once when the model writes personal details, then drops what still fails', async () => {
    const session = newSession();
    session.counts.messages = 2;
    session.display.push({ role: 'guest', text: 'Do you take Klarna?' });
    const model = scriptedModel([
      { content: [text('{"language":"en","topics":["financing","nope"],"unanswered_questions":["Do I qualify while pregnant?","Do you accept Klarna?"]}')] },
      { content: [text('{"language":"en","topics":["financing"],"unanswered_questions":["Do you accept Klarna?"]}')] },
    ]);
    const s = await summarize(session, catalog, model);
    expect(model.calls).toHaveLength(2);
    expect(s?.unanswered_questions).toEqual(['Do you accept Klarna?']);
    expect(s?.topics).toEqual(['financing']);
    expect(s?.free_text_dropped).toBe(false);
  });

  it("doesn't summarize staff conversations", async () => {
    const session = newSession();
    session.audience = 'staff';
    session.counts.messages = 3;
    expect(await summarize(session, catalog, scriptedModel([{ content: [text('{}')] }]))).toBeUndefined();
  });
});

describe('unanswered-questions report (D65)', () => {
  const summaries = [
    summary({ topics: ['financing', 'pricing'], unanswered_questions: ['Do you accept Klarna?'] }),
    summary({ topics: ['financing'], unanswered_questions: ['do you accept klarna'], requested_services_not_offered: ['Body contouring'] }),
    summary({ topics: ['off_topic'], unanswered_questions: ['Is there a loyalty program?'], after_hours: true, outcome: 'request' }),
    summary({ month: '2026-09', unanswered_questions: ['Last month question?'] }),
  ];

  it('groups the same question regardless of case and punctuation', () => {
    expect(countText([['Do you accept Klarna?'], ['do you accept klarna'], ['Other?']], 5)).toEqual([
      { text: 'Do you accept Klarna?', count: 2 },
      { text: 'Other?', count: 1 },
    ]);
  });

  it('builds the staff card for one month only', () => {
    const card = insightsCard(summaries, '2026-10', 'en');
    expect(card.type).toBe('insights');
    if (card.type !== 'insights') return;
    expect(card.period).toBe('October 2026');
    expect(card.conversations).toBe(3);
    expect(card.unanswered[0]).toEqual({ text: 'Do you accept Klarna?', count: 2 });
    expect(card.notOffered).toEqual([{ text: 'Body contouring', count: 1 }]);
    expect(card.topics[0]).toEqual({ text: 'Financing', count: 2 });
    expect(card.topics.some((t) => t.text === 'Off topic')).toBe(false);
  });

  it('emails only what is new, with no guest details, and nothing when there is nothing new', async () => {
    const store = new FileSummaryRepo();
    for (const s of summaries.slice(0, 3)) await store.add(s);
    const report = (await weeklyReport(catalog, store))!;
    expect(report.email.to).toBe(catalog.config.handoff.email_to);
    expect(report.email.body).toContain('Conversations: 3 (1 after hours)');
    expect(report.email.body).toContain('Appointment requests: 1');
    expect(report.email.body).toContain('Do you accept Klarna? (asked 2x)');
    expect(report.email.body).toContain('Average chat: 5 minutes, 4 messages');
    expect(report.email.body).toContain('Answer quality: not scored yet');
    expect(report.email.body).toContain('Flagged for review: 0');
    await store.markReported(report.covered);
    expect(await weeklyReport(catalog, store)).toBeUndefined();
  });
});

describe('end-of-chat scoring and review flags (D69)', () => {
  it('keeps whole-number scores from 1 to 5 and drops the grade without an overall score', async () => {
    const session = newSession();
    session.counts.messages = 2;
    session.createdAt = Date.now() - 5 * 60_000;
    session.lastActivity = Date.now();
    const graded = await summarize(
      session,
      catalog,
      scriptedModel([{ content: [text('{"language":"en","topics":[],"scores":{"answered":4,"next_step":9,"objections":null,"tone":"great","safety":5,"overall":4}}')] }]),
    );
    expect(graded?.scores).toEqual({ answered: 4, next_step: null, objections: null, tone: null, safety: 5, overall: 4 });
    expect(graded?.duration_seconds).toBe(300);
    const ungraded = await summarize(session, catalog, scriptedModel([{ content: [text('{"language":"en","scores":{"answered":4}}')] }]));
    expect(ungraded?.scores).toBeNull();
  });

  it('flags chats a person should review', () => {
    const base = { scores: null, feedback_down: 0, output_check_fallbacks: 0, outcome: 'answered' as const, unanswered_questions: [] };
    const good = { answered: 5, next_step: 5, objections: null, tone: 5, safety: 5, overall: 5 };
    expect(reviewFlags({ ...base, scores: good })).toEqual([]);
    expect(reviewFlags({ ...base, scores: { ...good, safety: 2 } })).toEqual(['safety_concern']);
    expect(reviewFlags({ ...base, scores: { ...good, next_step: 2 } })).toEqual(['low_score']);
    expect(reviewFlags({ ...base, scores: { ...good, overall: 3 } })).toEqual(['low_score']);
    expect(reviewFlags({ ...base, feedback_down: 1, output_check_fallbacks: 1 })).toEqual(['thumbs_down', 'fallback']);
    expect(reviewFlags({ ...base, outcome: 'urgent_redirect', unanswered_questions: ['Do you take Klarna?'] })).toEqual(['unanswered', 'urgent']);
    expect(reviewFlags({ ...base, outcome: 'handoff' })).toEqual(['handoff']);
  });
});
