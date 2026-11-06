// Schemas for a client's config.yaml and knowledge files. Unknown fields fail (build plan 10).
import { z } from 'zod';

const id = z.string().regex(/^[a-z0-9-]+$/);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const langMap = z.object({ en: z.string(), es: z.string().optional() }).strict();
export const localized = z.union([z.string(), langMap]);
export type Localized = z.infer<typeof localized>;
export const localizedList = z.union([
  z.array(z.string()),
  z.object({ en: z.array(z.string()), es: z.array(z.string()).optional() }).strict(),
]);
export type LocalizedList = z.infer<typeof localizedList>;

const day = z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
// Only open days are listed, so the record is partial.
const hours = z.partialRecord(day, z.string().regex(/^\d{2}:\d{2}-\d{2}:\d{2}$/));

const promotion = z
  .object({
    id,
    description: z.string(),
    services: z.array(id).min(1),
    percent_off: z.number().positive().max(100).optional(),
    amount_off: z.number().positive().optional(),
    starts: date,
    ends: date,
    terms: z.string().optional(),
    third_party_funded: z.boolean().default(false),
  })
  .strict()
  .refine((p) => (p.percent_off === undefined) !== (p.amount_off === undefined), {
    message: 'set exactly one of percent_off or amount_off',
  });

const questions = z.object({ en: z.array(z.string()), es: z.array(z.string()).optional() }).strict();

export const configSchema = z
  .object({
    client_id: id,
    demo: z.boolean().default(false),
    business: z
      .object({
        name: z.string(),
        phone: z.string(),
        urgent_line: z.string(),
        crisis_line: z.string().default('988'),
        privacy_policy_url: z.string().url(),
        consumer_health_privacy_policy_url: z.string().url().nullable().default(null),
        terminology: z.object({ clients: z.string(), services: z.string() }).strict(),
        locations: z
          .array(
            z
              .object({
                id,
                name: z.string().optional(),
                address: z.string(),
                timezone: z.string(),
                hours,
              })
              .strict(),
          )
          .min(1),
      })
      .strict(),
    booking_mode: z.enum(['link_handoff', 'in_chat']),
    booking: z
      .object({
        platform: z.string(),
        direct_links: z
          .object({
            default: z.string().url(),
            services: z.record(z.string(), z.string().url()).default({}),
            providers: z.record(z.string(), z.string().url()).default({}),
          })
          .strict(),
        self_service_link: z.string().url().optional(),
        rules: z
          .object({
            min_notice_hours: z.number(),
            max_days_ahead: z.number(),
            prerequisites: z.array(z.object({ service: id, requires: id }).strict()).default([]),
          })
          .strict(),
        secret_name: z.string().optional(),
        location_map: z.record(z.string(), z.string()).optional(),
        call_budget_per_day: z.number().optional(),
        pricing_mode: z.enum(['provider', 'starting_at']).optional(),
        allowed_phone_countries: z.array(z.string().length(2)).default(['US']),
        limits: z
          .object({
            max_bookings_per_session: z.number().int().positive().default(2),
            max_callbacks_per_session: z.number().int().positive().default(2),
            max_future_bookings_per_phone_7d: z.number().optional(),
            max_availability_checks_per_session: z.number().optional(),
            new_customer_same_day: z.enum(['flag', 'require_staff_approval', 'allow']).optional(),
          })
          .strict()
          // prefault, not default: an omitted block still gets the per-field defaults above.
          .prefault({}),
      })
      .strict(),
    knowledge: z
      .object({
        service_details_file: z.string(),
        services_file: z.string().optional(),
        faqs_file: z.string(),
        products_file: z.string().optional(),
        providers_file: z.string(),
        objections_file: z.string().optional(),
        urgent_message_file: z.string(),
        policies: z.record(z.string(), z.string()),
      })
      .strict(),
    sales: z
      .object({
        featured_services: z.array(id).default([]),
        add_on_suggestions: z.record(z.string(), z.array(id)).default({}),
        promotions: z.array(promotion).default([]),
        fit_rules_file: z.string().optional(),
        memberships: z
          .array(
            z
              .object({
                id,
                name: z.string(),
                monthly_price: z.number().positive(),
                includes: z.object({ service_id: id, per_month: z.number().int().positive() }).strict(),
                member_discount_percent: z.number().min(0).max(100).optional(), // off extra visits of the included treatment
                terms: z.string().optional(),
              })
              .strict(),
          )
          .default([]),
      })
      .strict(),
    first_visit: z
      .object({
        arrive_minutes_early: z.number().int().nonnegative(),
        parking: localized.optional(),
        bring: localizedList.default([]),
        intake_form_url: z.string().url().optional(),
        notes: localizedList.default([]),
      })
      .strict()
      .optional(),
    staff_mode: z
      .object({ enabled: z.boolean(), suggested: questions.default({ en: [] }) })
      .strict()
      .optional(),
    voice: z
      .object({
        tone: z.string(),
        dos: z.array(z.string()).default([]),
        donts: z.array(z.string()).default([]),
        examples_file: z.string().optional(),
      })
      .strict(),
    concierge: z
      .object({
        name: z.string(),
        avatar: z.object({ mode: z.enum(['illustrated', 'brand_mark', 'none']), id: z.string().optional() }).strict(),
        greeting: langMap,
        disclosure_label: langMap,
        chat_notice: z.object({ version: z.string(), en: z.string(), es: z.string().optional() }).strict(),
        marketing_consent: z.object({ version: z.string(), en: z.string(), es: z.string().optional() }).strict().optional(),
      })
      .strict(),
    branding: z
      .object({
        colors: z.object({ primary: z.string(), secondary: z.string(), accent: z.string() }).strict(),
        fonts: z.object({ heading: z.string(), body: z.string(), license: z.string() }).strict(),
        logo: z.object({ light: z.string().optional(), dark: z.string().optional() }).strict().optional(),
      })
      .strict(),
    display: z
      .object({
        modes: z.array(z.enum(['inline', 'fullscreen', 'launcher'])).min(1),
        nudge_delay_seconds: z.number().optional(),
        suggested_questions: z
          .object({ default: questions, pages: z.record(z.string(), questions).default({}) })
          .strict()
          .optional(),
      })
      .strict(),
    handoff: z
      .object({
        email_from: z.string().email(),
        email_to: z.string().email(),
        email_provider_baa_confirmed: z.boolean(),
        callback_response_time: langMap,
        categories: z.array(z.string()).min(1),
        extra_handoff_topics: z.array(z.string()).default([]),
      })
      .strict(),
    security: z.object({ allowed_domains: z.array(z.string()).min(1), widget_subdomain: z.string() }).strict(),
    languages: z.array(z.enum(['en', 'es'])).min(1),
    model: z
      .object({
        id: z.string(),
        summarizer_id: z.string().optional(),
        max_output_tokens: z.number().int().positive().default(2048),
        use_prompt_cache: z.boolean().default(true),
      })
      .strict(),
    // D31: every chat is kept transcripts_days; chats flagged for review (D69) are kept flagged_transcripts_days.
    retention: z
      .object({
        transcripts_days: z.number().int().positive(),
        flagged_transcripts_days: z.number().int().positive().default(90),
        summaries_months: z.number().int().positive(),
      })
      .strict()
      .refine((r) => r.flagged_transcripts_days >= r.transcripts_days, { message: 'flagged chats must be kept at least as long as other chats' }),
    compliance_profile: z
      .object({
        hipaa_covered_entity: z.boolean(),
        status_questionnaire: z
          .object({ completed_on: date.nullable(), warranty_signed: z.boolean(), next_review: date.nullable() })
          .strict(),
        state: z.string(),
        state_laws: z.array(z.string()).default([]),
        agreements: z.array(z.string()).default([]),
        call_recording_consent: z.string(),
        pilot_review_consent: z.object({ granted: z.boolean(), expires: date.nullable() }).strict(),
        medical_director_approval: z
          .object({ approver: z.string().nullable(), approved_on: date.nullable(), content_hash: z.string().nullable() })
          .strict(),
      })
      .strict(),
  })
  .strict()
  .superRefine((c, ctx) => {
    // D36: handoff emails only go to the client's own domain.
    const domain = c.handoff.email_to.split('@')[1] ?? '';
    if (!c.security.allowed_domains.includes(domain)) {
      ctx.addIssue({ code: 'custom', path: ['handoff', 'email_to'], message: `must be on one of security.allowed_domains (got ${domain})` });
    }
  });
export type ClientConfig = z.infer<typeof configSchema>;

const price = z
  .object({ amount: z.number().nonnegative(), unit: z.enum(['session', 'unit', 'syringe', 'area']), from: z.boolean().default(false) })
  .strict();

export const servicesFileSchema = z
  .object({
    services: z.array(
      z
        .object({ id, name: z.string(), category: id, price, duration_minutes: z.number().int().positive(), last_verified: date })
        .strict(),
    ),
    add_ons: z
      .array(z.object({ id, name: z.string(), price, duration_minutes: z.number().int().positive() }).strict())
      .default([]),
  })
  .strict();

export const serviceDetailsSchema = z.record(
  id,
  z
    .object({
      summary: localized,
      what_to_expect: localized,
      downtime: localized,
      results: localized.optional(),
      prep: localized.optional(),
      aftercare: localized.optional(),
      good_for: z.array(z.string()).default([]),
      requires_assessment: z.boolean(),
      image: z.string().optional(),
      testimonials: z.array(z.string()).default([]),
      // Event countdown planner (D62): how many days before an event to have it. Approved content.
      timing: z
        .object({ min_days_before_event: z.number().int().nonnegative(), ideal_days_before_event: z.number().int().nonnegative() })
        .strict()
        .refine((t) => t.ideal_days_before_event >= t.min_days_before_event, { message: 'ideal must be at least min' })
        .optional(),
      care: z
        .object({ before: localizedList.optional(), day_of: localizedList.optional(), after: localizedList.optional() })
        .strict()
        .optional(),
    })
    .strict(),
);

export const providersFileSchema = z
  .object({
    providers: z.array(
      z
        .object({
          id,
          name: z.string(),
          credentials: z.string().optional(),
          title: localized,
          bio: localized,
          specialties: z.array(z.string()).default([]),
          services: z.array(id),
          languages: z.array(z.enum(['en', 'es'])).default(['en']),
        })
        .strict(),
    ),
  })
  .strict();

export const faqsFileSchema = z.object({ faqs: z.array(z.object({ q: z.string(), a: z.string() }).strict()) }).strict();
export const objectionsFileSchema = z
  .object({ objections: z.array(z.object({ objection: z.string(), answer: z.string() }).strict()) })
  .strict();
export const fitRulesFileSchema = z
  .object({ fit_rules: z.array(z.object({ situation: z.string(), response: z.string() }).strict()) })
  .strict();
export const productsFileSchema = z
  .object({ products: z.array(z.object({ name: z.string(), price: z.number().nonnegative(), note: z.string().optional() }).strict()) })
  .strict();

const helpMessage = z.object({ title: langMap, body: langMap }).strict();
export const urgentFileSchema = z
  .object({ approved_by: z.string(), post_treatment: helpMessage, emergency: helpMessage, crisis: helpMessage })
  .strict();
export type UrgentMessages = z.infer<typeof urgentFileSchema>;
