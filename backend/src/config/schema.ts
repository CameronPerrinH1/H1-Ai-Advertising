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
    // Only for guests at this event (sales.events), when set.
    event: id.optional(),
    percent_off: z.number().positive().max(100).optional(),
    amount_off: z.number().positive().optional(),
    starts: date,
    // No end date: evergreen, always running.
    ends: date.optional(),
    // Who qualifies, like "First-time guests".
    eligibility: z.string().optional(),
    terms: z.string().optional(),
    third_party_funded: z.boolean().default(false),
  })
  .strict()
  .refine((p) => (p.percent_off === undefined) !== (p.amount_off === undefined), {
    message: 'set exactly one of percent_off or amount_off',
  });

// The intake wizard's Sales Playbook (09-intake-wizard.md, Section 5). Every field is optional or
// defaulted, so a config written by hand before the export still loads unchanged.
export const PRICE_MODES = ['exact', 'starting_at', 'at_consult'] as const;
export type PriceMode = (typeof PRICE_MODES)[number];

const event = z
  .object({
    id,
    name: z.string(),
    // A dated event, or one that recurs every year in a month (1 to 12) with no date set yet.
    date: date.optional(),
    month: z.number().int().min(1).max(12).optional(),
    time: z.string().optional(),
    location: z.string().optional(),
    description: z.string(),
    audience: z.enum(['public', 'members', 'invite']).default('public'),
    // RSVPs: on a callback card in the chat (D52), at a link, or none.
    rsvp: z.enum(['card', 'link', 'none']).default('none'),
    rsvp_link: z.string().url().optional(),
  })
  .strict()
  .refine((e) => (e.date === undefined) !== (e.month === undefined), { message: 'set exactly one of date or month' })
  .refine((e) => e.rsvp !== 'link' || e.rsvp_link !== undefined, { message: 'rsvp: link needs rsvp_link' });

const tactics = z
  .object({
    // Promotions only ever come from sales.promotions (D13, D18).
    promotions: z.enum(['never', 'when_asked', 'when_relevant', 'on_hesitation']).default('when_relevant'),
    hesitation_promotion: id.optional(),
    // When to offer an appointment request or callback card (D35, D52).
    offer_contact: z.enum(['early', 'after_first_answer', 'when_asked']).default('after_first_answer'),
    suggest_booking: z.enum(['most_replies', 'after_educating', 'when_asked']).default('after_educating'),
    // No invented scarcity either way (D17); 'never' also keeps real end dates out of the pitch.
    urgency: z.enum(['never', 'real_deadlines_only']).default('real_deadlines_only'),
  })
  .strict()
  .refine((t) => t.promotions !== 'on_hesitation' || t.hesitation_promotion !== undefined, {
    message: 'promotions: on_hesitation needs hesitation_promotion',
  });

// Approved wording for each kind of handoff; {response_time} is filled from handoff.callback_response_time.
export const HANDOFF_WORDING_KEYS = ['cant_answer', 'medical', 'not_offered', 'consult_required', 'callback', 'complaint'] as const;

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
        terminology: z
          .object({ clients: z.string(), services: z.string(), providers: z.string().optional(), booking: z.string().optional() })
          .strict(),
        locations: z
          .array(
            z
              .object({
                id,
                name: z.string().optional(),
                address: z.string(),
                timezone: z.string(),
                hours,
                // No set hours: appointments only, on days and times that vary. hours stays empty.
                by_appointment: z.boolean().default(false),
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
        // false: the chat never shows a booking-page link (Cameron, Nov 11, Plumb + Pine): booking
        // always happens in the chat, and without live openings the team takes the guest's times.
        links: z.boolean().default(true),
        rules: z
          .object({
            min_notice_hours: z.number(),
            max_days_ahead: z.number(),
            prerequisites: z.array(z.object({ service: id, requires: id }).strict()).default([]),
          })
          .strict(),
        secret_name: z.string().optional(),
        // Live openings from the booking platform's API (read only; no guest data is sent). The
        // secret with the API keys is named per deployment (infra/lib/deployments.ts).
        availability: z
          .object({
            source: z.literal('vagaro'),
            business_id: z.string(),
            // The platform's id for each service on the chat's menu (and each consultation).
            service_ids: z.record(id, z.string()),
            days_shown: z.number().int().min(1).max(5).default(3),
            times_per_day: z.number().int().min(1).max(8).default(4),
            // Holds: a confirmed time is blocked on the provider's calendar until the spa makes the
            // appointment. Released (and the spa told) if still there after release_after_hours.
            // Each deployment also has to switch holds on (infra/lib/deployments.ts).
            holds: z
              .object({ enabled: z.boolean().default(false), release_after_hours: z.number().min(1).max(168).default(24) })
              .strict()
              .default({ enabled: false, release_after_hours: 24 }),
            // The platform's id for each provider on the chat's provider list, for releasing holds.
            provider_ids: z.record(id, z.string()).default({}),
          })
          .strict()
          .optional(),
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
        concerns_file: z.string().optional(),
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
        // Per-service price display (D72): exact from the price list, "starting at", or at consultation.
        pricing: z
          .object({ default: z.enum(PRICE_MODES).default('exact'), services: z.record(z.string(), z.enum(PRICE_MODES)).default({}) })
          .strict()
          .prefault({}),
        // Never recommended unprompted; answered if a guest asks.
        do_not_promote: z.array(id).default([]),
        // Other treatments worth suggesting with a treatment.
        pairings: z.record(z.string(), z.array(id)).default({}),
        growth: z
          .object({
            packages: z.array(z.object({ name: z.string(), why: z.string() }).strict()).default([]),
            differentiators: z.array(z.string()).default([]),
            in_their_words: z.string().optional(),
          })
          .strict()
          .prefault({}),
        events: z.array(event).default([]),
        tactics: tactics.prefault({}),
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
        emoji: z.enum(['never', 'occasionally']).default('never'),
        exclamation: z.enum(['yes', 'sparingly', 'never']).default('sparingly'),
        length: z.enum(['short', 'detail']).default('short'),
        sign_off: z.string().optional(),
      })
      .strict(),
    concierge: z
      .object({
        name: z.string(),
        // portrait: an AI-generated face from H1's approved set, always beside the AI label (D45).
        // id: one of H1's portraits (widget/public/avatars/look-1.jpg to look-8.jpg) when mode is portrait.
        avatar: z.object({ mode: z.enum(['portrait', 'illustrated', 'brand_mark', 'none']), id: z.string().regex(/^look-[1-8]$/).optional() }).strict(),
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
        modes: z.array(z.enum(['inline', 'fullscreen', 'launcher', 'askbar'])).min(1),
        // Per page of the spa's site (exact path, or a prefix ending in "*"): what the ask bar and
        // the chat's first message say there. Approved copy, like the greeting.
        pages: z
          .record(z.string(), z.object({ greeting: localized.optional(), placeholder: localized.optional(), topic: localized.optional() }).strict())
          .default({}),
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
        // D87: H1's recorded exception to D36 for one exact address off the client's domain
        // (a solo owner's Gmail). It covers that address only, so a typo still fails.
        email_to_exception: z
          .object({ address: z.string().email(), approved_by: z.string(), approved_on: date, reason: z.string() })
          .strict()
          .optional(),
        email_provider_baa_confirmed: z.boolean(),
        callback_response_time: langMap,
        categories: z.array(z.string()).min(1),
        extra_handoff_topics: z.array(z.string()).default([]),
        wording: z.partialRecord(z.enum(HANDOFF_WORDING_KEYS), localized).default({}),
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
        // How hard the model thinks before replying. "medium" follows the selling rules noticeably
        // better than "low" for about 0.2 s more per reply (sales review, Nov 10 2026).
        effort: z.enum(['low', 'medium', 'high']).default('medium'),
        // "off" skips the hidden reasoning entirely (faster; Haiku and Sonnet only, not Opus 5.5).
        thinking: z.enum(['adaptive', 'off']).default('adaptive'),
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
        // The owner's approval of the same intake answers (D83), when the content came from the wizard.
        owner_approval: z
          .object({ approver: z.string().nullable(), approved_on: date.nullable(), content_hash: z.string().nullable() })
          .strict()
          .optional(),
      })
      .strict(),
  })
  .strict()
  .superRefine((c, ctx) => {
    // D36: handoff emails only go to the client's own domain, unless H1 recorded an exception
    // for that exact address (D87).
    const domain = c.handoff.email_to.split('@')[1] ?? '';
    const excepted = c.handoff.email_to_exception?.address.toLowerCase() === c.handoff.email_to.toLowerCase();
    if (!excepted && !c.security.allowed_domains.includes(domain)) {
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
        // duration_minutes: optional until the spa gives it; the chat never states one it doesn't have.
        .object({ id, name: z.string(), category: id, price, duration_minutes: z.number().int().positive().optional(), last_verified: date })
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
      downtime: localized.optional(), // left out until the spa gives it; never guessed
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
  .object({
    products: z.array(
      z
        .object({
          name: z.string(),
          price: z.number().nonnegative(),
          note: z.string().optional(),
          brand: z.string().optional(),
          category: z.string().optional(),
          priority: z.enum(['high', 'normal', 'none']).default('normal'),
          after_services: z.array(id).default([]), // suggested after these treatments
          helps_with: z.array(z.string()).default([]), // concerns, as named in concerns.yaml
          sold: z.enum(['both', 'in_store', 'online']).default('both'),
        })
        .strict(),
    ),
  })
  .strict();

// What guests describe and the treatments to lead with (feeds the treatment finder). With no
// matching treatment, `otherwise` says whether to offer a consultation or the front desk.
const fallback = z.enum(['consult', 'front_desk']);
export const concernsFileSchema = z
  .object({
    concerns: z.array(z.object({ name: z.string(), services: z.array(id).default([]), otherwise: fallback.default('consult') }).strict()),
    // Pregnant or nursing guests: treatments the spa offers them (medical director approved).
    pregnancy: z.object({ services: z.array(id).default([]), otherwise: fallback.default('consult') }).strict().optional(),
  })
  .strict();

const helpMessage = z.object({ title: langMap, body: langMap }).strict();
export const urgentFileSchema = z
  .object({
    approved_by: z.string(),
    post_treatment: helpMessage,
    emergency: helpMessage,
    crisis: helpMessage,
    // The spa's own symptom lists (wizard, medical director approved): emergency means 911,
    // urgent means the urgent line. Emergency ones also join the keyword net (D14).
    emergency_symptoms: z.array(z.string()).default([]),
    urgent_symptoms: z.array(z.string()).default([]),
  })
  .strict();
export type UrgentMessages = z.infer<typeof urgentFileSchema>;
