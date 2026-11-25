// Reports built from summaries (D65): the staff-mode "what couldn't Ava answer" card and the weekly
// email to the spa. Only aggregates leave the summaries (D32).
import type { Card, CountedItem, Lang, QualityView } from '@concierge/shared';
import type { Catalog } from '../catalog.ts';
import type { Email } from '../handoff/email.ts';
import type { StoredSummary, SummaryRepo } from './store.ts';
import { SCORE_KEYS, type ReviewFlag, type ScoreKey, type Summary, type Topic } from './types.ts';

const TOPIC_LABELS: Record<Lang, Record<Topic, string>> = {
  en: {
    pricing: 'Pricing',
    availability: 'Availability',
    booking: 'Booking',
    service_info: 'Treatment questions',
    prep_aftercare: 'Prep and aftercare',
    downtime: 'Downtime',
    results_expectations: 'Results',
    providers: 'Providers',
    policies: 'Policies',
    promotions: 'Promotions',
    location_hours: 'Location and hours',
    financing: 'Financing',
    products: 'Products',
    gift_cards: 'Gift cards',
    memberships_packages: 'Memberships',
    reschedule_cancel: 'Reschedule or cancel',
    medical_question: 'Medical questions',
    complaint: 'Concerns',
    off_topic: 'Off topic',
    other: 'Other',
  },
  es: {
    pricing: 'Precios',
    availability: 'Disponibilidad',
    booking: 'Reservas',
    service_info: 'Preguntas sobre tratamientos',
    prep_aftercare: 'Preparación y cuidados',
    downtime: 'Recuperación',
    results_expectations: 'Resultados',
    providers: 'Proveedores',
    policies: 'Políticas',
    promotions: 'Promociones',
    location_hours: 'Ubicación y horario',
    financing: 'Financiamiento',
    products: 'Productos',
    gift_cards: 'Tarjetas de regalo',
    memberships_packages: 'Membresías',
    reschedule_cancel: 'Cambiar o cancelar',
    medical_question: 'Preguntas médicas',
    complaint: 'Inquietudes',
    off_topic: 'Fuera de tema',
    other: 'Otro',
  },
};

const SCORE_LABELS: Record<Lang, Record<ScoreKey, string>> = {
  en: { answered: 'Answered the question', next_step: 'Offered a next step', objections: 'Handled hesitation', tone: 'Tone', safety: 'Stayed safe' },
  es: { answered: 'Respondió la pregunta', next_step: 'Ofreció un siguiente paso', objections: 'Manejó las dudas', tone: 'Tono', safety: 'Se mantuvo seguro' },
};

const FLAG_LABELS: Record<Lang, Record<ReviewFlag, string>> = {
  en: {
    safety_concern: 'Safety concern',
    low_score: 'Low score',
    thumbs_down: 'Thumbs down',
    fallback: 'Safe fallback reply',
    handoff: 'Handed to staff',
    unanswered: 'Unanswered question',
    urgent: 'Urgent concern',
    crisis: 'Crisis referral (988)',
  },
  es: {
    safety_concern: 'Problema de seguridad',
    low_score: 'Puntaje bajo',
    thumbs_down: 'Calificación negativa',
    fallback: 'Respuesta de respaldo',
    handoff: 'Pasó al personal',
    unanswered: 'Pregunta sin respuesta',
    urgent: 'Inquietud urgente',
    crisis: 'Derivación por crisis (988)',
  },
};

const REASON_LABELS: Record<Lang, Record<Summary['feedback_reasons'][number], string>> = {
  en: { wrong_info: 'Wrong info', didnt_understand: "Didn't understand", other: 'Something else' },
  es: { wrong_info: 'Información incorrecta', didnt_understand: 'No entendió', other: 'Otra cosa' },
};

const mean = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);

// Chat length and answer quality (D69). Older summaries without these fields simply don't count.
export function qualityView(summaries: Summary[], lang: Lang): QualityView {
  const graded = summaries.map((s) => s.scores).filter((x): x is NonNullable<Summary['scores']> => !!x);
  const flags = summaries.flatMap((s) => s.review_flags ?? []);
  const flagCounts = new Map<ReviewFlag, number>();
  for (const f of flags) flagCounts.set(f, (flagCounts.get(f) ?? 0) + 1);
  return {
    avgMinutes: mean(summaries.filter((s) => typeof s.duration_seconds === 'number').map((s) => s.duration_seconds / 60)),
    avgMessages: mean(summaries.map((s) => s.message_count)),
    scored: graded.length,
    avgScore: mean(graded.map((g) => g.overall)),
    scores: SCORE_KEYS.flatMap((k) => {
      const avg = mean(graded.map((g) => g[k]).filter((v): v is number => typeof v === 'number'));
      return avg === null ? [] : [{ text: SCORE_LABELS[lang][k], avg }];
    }),
    flagged: summaries.filter((s) => (s.review_flags ?? []).length > 0).length,
    flagReasons: [...flagCounts.entries()].sort((a, b) => b[1] - a[1]).map(([f, count]) => ({ text: FLAG_LABELS[lang][f], count })),
    helpful: summaries.reduce((n, s) => n + (s.feedback_up ?? 0), 0),
    notHelpful: summaries.reduce((n, s) => n + (s.feedback_down ?? 0), 0),
    notHelpfulReasons: countText(
      summaries.map((s) => (s.feedback_reasons ?? []).map((r) => REASON_LABELS[lang][r])),
      3,
    ),
  };
}

// Groups the same question asked with different capitalization or punctuation.
export function countText(lists: string[][], limit: number): CountedItem[] {
  const groups = new Map<string, CountedItem>();
  for (const t of lists.flat()) {
    const key = t.toLowerCase().replace(/[?.!¿¡]+/g, '').replace(/\s+/g, ' ').trim();
    const g = groups.get(key);
    if (g) g.count += 1;
    else groups.set(key, { text: t.trim(), count: 1 });
  }
  return [...groups.values()].sort((a, b) => b.count - a.count || a.text.localeCompare(b.text)).slice(0, limit);
}

export function insightsCard(summaries: Summary[], month: string, lang: Lang): Card {
  const inMonth = summaries.filter((s) => s.month === month);
  const topicCounts = new Map<Topic, number>();
  for (const s of inMonth) for (const t of s.topics) topicCounts.set(t, (topicCounts.get(t) ?? 0) + 1);
  const period = new Date(`${month}-15T12:00:00Z`).toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return {
    type: 'insights',
    period,
    conversations: inMonth.length,
    unanswered: countText(inMonth.map((s) => s.unanswered_questions), 8),
    notOffered: countText(inMonth.map((s) => s.requested_services_not_offered), 5),
    topics: [...topicCounts.entries()]
      .filter(([t]) => t !== 'off_topic' && t !== 'other')
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([t, count]) => ({ text: TOPIC_LABELS[lang][t], count })),
    quality: qualityView(inMonth, lang),
  };
}

// The weekly email covers summaries not yet reported. Returns undefined when there's nothing new.
export async function weeklyReport(catalog: Catalog, store: SummaryRepo): Promise<{ email: Email; covered: StoredSummary[] } | undefined> {
  const covered = await store.unreported();
  if (!covered.length) return undefined;
  const summaries = covered.map((c) => c.summary);
  const unanswered = countText(summaries.map((s) => s.unanswered_questions), 10);
  const notOffered = countText(summaries.map((s) => s.requested_services_not_offered), 5);
  const afterHours = summaries.filter((s) => s.after_hours).length;
  const requests = summaries.filter((s) => s.outcome === 'request').length;
  const q = qualityView(summaries, 'en');
  const c = catalog.config;
  const lines = [
    `Here's what visitors asked ${c.concierge.name} this week.`,
    '',
    `Conversations: ${summaries.length} (${afterHours} after hours)`,
    `Appointment requests: ${requests}`,
    `Average chat: ${q.avgMinutes ?? '-'} minutes, ${q.avgMessages ?? '-'} messages`,
    '',
    `Answer quality: ${q.avgScore === null ? 'not scored yet' : `${q.avgScore} out of 5 across ${q.scored} graded chats`}`,
    ...q.scores.map((x) => `  - ${x.text}: ${x.avg}`),
    `Thumbs: ${q.helpful} helpful, ${q.notHelpful} not helpful${q.notHelpfulReasons.length ? ` (${q.notHelpfulReasons.map((r) => `${r.text.toLowerCase()} ${r.count}`).join(', ')})` : ''}`,
    `Flagged for review: ${q.flagged}${q.flagReasons.length ? ` (${q.flagReasons.map((r) => `${r.text.toLowerCase()} ${r.count}`).join(', ')})` : ''}`,
    '',
    `Questions ${c.concierge.name} couldn't answer:`,
    ...(unanswered.length ? unanswered.map((u) => `  - ${u.text} (asked ${u.count}x)`) : ['  - None this week.']),
    '',
    "Services visitors asked for that you don't offer:",
    ...(notOffered.length ? notOffered.map((u) => `  - ${u.text} (${u.count}x)`) : ['  - None this week.']),
    '',
    `Reply with answers to any of these questions and we'll add them to ${c.concierge.name}'s knowledge after your review.`,
    '',
    'This report contains no guest names, contact details, or conversation text.',
  ];
  return {
    email: { from: c.handoff.email_from, to: c.handoff.email_to, subject: `This week's questions for ${c.concierge.name}`, body: lines.join('\n') },
    covered,
  };
}
