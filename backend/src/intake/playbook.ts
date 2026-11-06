// The intake wizard's export (09-intake-wizard.md, Section 5): the format H1's site writes
// (apps/site-h1/src/onboarding/export.ts) and this importer reads. Everything in it is already text
// the spa approved; names are names, matched to this client's ids by the importer.
import { z } from 'zod';

const text = z.string();
const names = z.array(z.string());
const fallback = z.enum(['consult', 'front_desk']);
const priceMode = z.enum(['exact', 'starting_at', 'at_consult']);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const key = z.string().regex(/^[a-z0-9-]+$/);
const month = z.number().int().min(1).max(12);

export const playbookSchema = z
  .object({
    version: z.literal(1),
    spa: z.object({ id: text, name: text, timeZone: text }).strict(),
    contentHash: text,
    approvals: z.array(z.object({ role: z.enum(['owner', 'md']), name: text, credential: text, approvedOn: day }).strict()),
    exportedOn: day,
    identity: z
      .object({
        name: text.min(1),
        label: text.regex(/\bAI\b/, 'the label must say it is AI (D45)'),
        avatar: z.object({ mode: z.enum(['portrait', 'brand_mark', 'illustrated']), id: text.optional() }).strict(),
        greeting: text.min(1),
      })
      .strict(),
    terminology: z.object({ guests: text, treatments: text, providers: text, booking: text }).strict(),
    voice: z
      .object({
        tone: text,
        emoji: z.enum(['never', 'occasionally']),
        exclamation: z.enum(['yes', 'sparingly', 'never']),
        length: z.enum(['short', 'detail']),
        signOff: text.optional(),
        dos: names,
        neverSay: names,
        examples: z.array(z.object({ guest: text.optional(), reply: text }).strict()),
      })
      .strict(),
    languages: z.array(z.enum(['en', 'es'])).min(1),
    pricing: priceMode,
    services: z.array(
      z
        .object({
          name: text,
          category: text,
          priority: z.enum(['high', 'normal', 'none']),
          why: text,
          pairsWith: names,
          upgrades: names,
          consultFirst: z.boolean(),
          price: priceMode.nullable(),
        })
        .strict(),
    ),
    concerns: z.array(z.object({ name: text, services: names, otherwise: fallback }).strict()),
    pregnancy: z.object({ services: names, otherwise: fallback }).strict(),
    products: z.array(
      z
        .object({
          name: text,
          brand: text,
          category: text,
          priority: z.enum(['high', 'normal', 'none']),
          why: text,
          after: names,
          helpsWith: names,
          sold: z.enum(['both', 'in_store', 'online']),
        })
        .strict(),
    ),
    growth: z
      .object({ packages: z.array(z.object({ name: text, why: text }).strict()), differentiators: names, inTheirWords: text, competitors: text })
      .strict(),
    promotions: z.array(
      z
        .object({
          key,
          name: text,
          terms: text,
          starts: day.optional(),
          ends: day.optional(),
          startMonth: month.optional(),
          endMonth: month.optional(),
          services: names,
          everything: z.boolean(),
          event: key.optional(),
        })
        .strict()
        .refine((p) => (p.starts && p.ends) || (p.startMonth && p.endMonth), { message: 'needs dates or months' }),
    ),
    events: z.array(
      z
        .object({
          key,
          name: text,
          date: day.optional(),
          month: month.optional(),
          time: text,
          location: text,
          description: text,
          audience: z.enum(['public', 'members', 'invite']),
          rsvp: z.enum(['card', 'link', 'none']),
          link: z.string().url().optional(),
        })
        .strict(),
    ),
    objections: z.array(z.object({ objection: text, answer: text }).strict()),
    tactics: z
      .object({
        promotions: z.enum(['never', 'when_asked', 'when_relevant', 'on_hesitation']),
        hesitationPromotion: key.optional(),
        offerContact: z.enum(['early', 'after_first_answer', 'when_asked']),
        suggestBooking: z.enum(['most_replies', 'after_educating', 'when_asked']),
        urgency: z.enum(['never', 'real_deadlines_only']),
      })
      .strict(),
    handoff: z
      .object({ cant_answer: text, medical: text, not_offered: text, consult_required: text, callback: text, complaint: text })
      .strict(),
    urgent: z
      .object({
        line: text,
        hours: text,
        afterHours: text,
        emergencySymptoms: names,
        urgentSymptoms: names,
        emergencyMessage: text,
        urgentMessage: text,
      })
      .strict(),
  })
  .strict();

export type Playbook = z.infer<typeof playbookSchema>;
