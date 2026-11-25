import { describe, expect, it } from 'vitest';
import type { Card } from '@concierge/shared';
import { handleTool, type ToolContext } from '../src/tools/handlers.ts';
import { catalog, newSession, TODAY } from './helpers.ts';

function ctx(): ToolContext {
  return { catalog, session: newSession(), lang: 'en', today: TODAY, phoneKey: 'test', extraAmounts: new Set() };
}

const appointment = {
  service_id: 'hydrafacial',
  preferred_times: 'Saturday mornings',
  first_name: 'Jane',
  last_name: 'Smith',
  phone: '503-555-0142',
};

describe('tool validation (D10)', () => {
  it('rejects unknown services on cards', () => {
    const r = handleTool('show_service_card', { service_id: 'tattoo-removal' }, ctx());
    expect(r.isError).toBe(true);
  });

  it('blocks invented prices in treatment-option reasons', () => {
    const r = handleTool(
      'show_treatment_options',
      { options: [{ service_id: 'hydrafacial', reason: 'Only $79 today, a steal before your event.' }] },
      ctx(),
    );
    expect(r.isError).toBe(true);
  });

  it('renders treatment options from catalog data (D59)', () => {
    const r = handleTool(
      'show_treatment_options',
      { headline: 'For your event', options: [{ service_id: 'hydrafacial', reason: 'Glows the same day, easy to fit in.' }] },
      ctx(),
    );
    expect(r.isError).toBeUndefined();
    const card = r.cards?.[0];
    expect(card?.type).toBe('treatment_options');
    if (card?.type === 'treatment_options') expect(card.items[0]!.service.price.amount).toBe(199);
  });

  it('drops chips that fail the checks', () => {
    const r = handleTool('suggest_replies', { replies: ['Tell me more', 'Get it for $85', 'Book online'] }, ctx());
    expect(r.quickReplies).toEqual(['Tell me more', 'Book online']);
  });

  it('sends treatments that need an assessment to the consultation link', () => {
    const r = handleTool('get_booking_link', { service_id: 'botox' }, ctx());
    const card = r.cards?.[0];
    expect(card?.type === 'booking_link' && card.consult && card.url.endsWith('/injectable-consultation')).toBe(true);
    const manage = handleTool('get_booking_link', { purpose: 'manage' }, ctx()).cards?.[0];
    expect(manage?.type === 'booking_link' && manage.url.endsWith('/my-appointments')).toBe(true);
  });
});

describe('appointment requests (D52, D61)', () => {
  it('prepares a confirmation card and a pending action, without sending anything', () => {
    const c = ctx();
    const r = handleTool('request_appointment', appointment, c);
    expect(r.result.status).toBe('awaiting_confirmation');
    const card = r.cards?.[0];
    expect(card?.type).toBe('confirm');
    expect(c.session.pendingActions.size).toBe(1);
    expect(c.session.phoneHashes.size).toBe(1);
  });

  it('rejects invalid phones and mismatched providers', () => {
    expect(handleTool('request_appointment', { ...appointment, phone: '123' }, ctx()).isError).toBe(true);
    expect(handleTool('request_appointment', { ...appointment, staff_id: 'maya-chen' }, ctx()).isError).toBe(true);
  });

  it('adds the consultation note for injectables', () => {
    const card = handleTool('request_appointment', { ...appointment, service_id: 'botox' }, ctx()).cards?.[0];
    expect(card?.type === 'confirm' && card.note.includes('consultation')).toBe(true);
  });

  it('enforces the per-session limit (D25)', () => {
    const c = ctx();
    c.session.counts.requests = 2;
    expect(handleTool('request_appointment', appointment, c).isError).toBe(true);
  });

  it('removes card numbers and phone numbers from free text', () => {
    const c = ctx();
    const r = handleTool('request_appointment', { ...appointment, preferred_times: 'Sat am, card 4111 1111 1111 1111' }, c);
    const card = r.cards?.[0];
    const times = card?.type === 'confirm' ? card.fields.find((f) => f.key === 'times')?.value : '';
    expect(times).not.toMatch(/4111/);
  });
});

describe('callbacks', () => {
  it('validates the category and keeps the reason off the card text the model wrote', () => {
    expect(handleTool('request_callback', { first_name: 'Jane', phone: '503-555-0142', category: 'gossip' }, ctx()).isError).toBe(true);
    const card = handleTool('request_callback', { first_name: 'Jane', phone: '503-555-0142', category: 'medical_question' }, ctx()).cards?.[0];
    expect(card?.type === 'confirm' && card.fields.find((f) => f.key === 'reason')?.value).toBe('Medical question');
  });
});

describe('planning tools (D62)', () => {
  it('builds the countdown card, remembers the plan, and allows its total in the reply', () => {
    const c = ctx();
    const r = handleTool('plan_event_timeline', { event_date: '2026-11-21', event_label: 'the wedding', service_ids: ['hydrafacial', 'botox'] }, c);
    const card = r.cards?.[0];
    expect(card?.type).toBe('event_plan');
    if (card?.type !== 'event_plan') return;
    expect(card.items.map((i) => i.service.id)).toEqual(['botox', 'hydrafacial']);
    expect(card.estimate.perUnit).toEqual(['Botox']);
    expect(c.session.lastPlan?.items).toHaveLength(2);
    expect(c.extraAmounts.has(199)).toBe(true);
  });

  it('rejects labels that carry prices or contact details', () => {
    expect(handleTool('plan_event_timeline', { event_date: '2026-11-21', event_label: 'call 503-555-0142', service_ids: ['hydrafacial'] }, ctx()).isError).toBe(true);
    expect(handleTool('plan_event_timeline', { event_date: '2026-11-21', event_label: 'a $500 glow up', service_ids: ['hydrafacial'] }, ctx()).isError).toBe(true);
  });

  it('requests every treatment in the saved plan at once', () => {
    const c = ctx();
    const { service_id: _, preferred_times: __, ...person } = appointment;
    expect(handleTool('request_appointment', { ...person, use_event_plan: true }, c).isError).toBe(true);
    handleTool('plan_event_timeline', { event_date: '2026-11-21', service_ids: ['hydrafacial', 'botox'] }, c);
    const card = handleTool('request_appointment', { ...person, use_event_plan: true }, c).cards?.[0];
    expect(card?.type).toBe('confirm');
    if (card?.type !== 'confirm') return;
    expect(card.fields.find((f) => f.key === 'treatment')?.value).toBe('Botox, HydraFacial Signature');
    expect(card.fields.find((f) => f.key === 'times')?.value).toContain('Botox ~');
    expect(card.note).toContain('consultation');
    const action = [...c.session.pendingActions.values()][0]!;
    expect(action.kind === 'appointment' && action.payload.serviceIds).toEqual(['botox', 'hydrafacial']);
  });

  it('estimates with unknown IDs rejected and the total allowed in the reply', () => {
    expect(handleTool('estimate_visit', { service_ids: ['hydrafacial', 'tattoo-removal'] }, ctx()).isError).toBe(true);
    const c = ctx();
    const r = handleTool('estimate_visit', { service_ids: ['hydrafacial'], add_on_ids: ['led-light-therapy-add-on'] }, c);
    expect(r.result.estimated_total).toBe(234);
    expect(c.extraAmounts.has(234)).toBe(true);
  });

  it('shows care guides, membership savings, and the first-visit card from approved content', () => {
    const care = handleTool('show_care_guide', { service_id: 'chemical-peel', focus: 'after' }, ctx()).cards?.[0];
    expect(care?.type === 'care_guide' && care.after.length > 0 && care.focus === 'after').toBe(true);
    const es = handleTool('show_care_guide', { service_id: 'chemical-peel' }, { ...ctx(), lang: 'es' }).cards?.[0];
    expect(es?.type === 'care_guide' && care?.type === 'care_guide' && es.before.length > 0 && es.before[0] !== care.before[0]).toBe(true);

    const m = handleTool('show_membership_savings', { visits_per_year: 12 }, ctx()).cards?.[0];
    expect(m?.type === 'membership' && m.savings).toBe(360);

    const fv = handleTool('show_first_visit', {}, ctx()).cards?.[0];
    expect(fv?.type === 'first_visit' && fv.formUrl).toBe('https://glowmedspa.example/new-guest-form');
  });
});

describe('staff mode (D64, D65)', () => {
  it('only shows the report when an insights provider is present', () => {
    expect(handleTool('show_unanswered_questions', {}, ctx()).isError).toBe(true);
    const card: Card = {
      type: 'insights',
      period: 'October 2026',
      conversations: 3,
      unanswered: [],
      notOffered: [],
      topics: [],
      quality: { avgMinutes: null, avgMessages: null, scored: 0, avgScore: null, scores: [], flagged: 0, flagReasons: [], helpful: 0, notHelpful: 0, notHelpfulReasons: [] },
    };
    const r = handleTool('show_unanswered_questions', {}, { ...ctx(), insights: () => card });
    expect(r.cards?.[0]?.type).toBe('insights');
  });
});
