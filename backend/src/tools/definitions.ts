// The model's tools, in Converse API format. Mirrors ai-concierge-handoff/templates/tool-definitions.json
// plus the pilot's card tools (07-pilot-v1.md, D59). The pilot runs in link_handoff mode, so the
// booking tools (check_availability, create_booking) aren't offered.
import type { Tool } from '@aws-sdk/client-bedrock-runtime';

function tool(name: string, description: string, properties: Record<string, unknown>, required: string[] = []): Tool {
  return {
    toolSpec: {
      name,
      description,
      inputSchema: { json: { type: 'object', additionalProperties: false, properties, required } as never },
    },
  };
}

const serviceId = { type: 'string', description: 'Service ID from the catalog.' };
const staffId = { type: 'string', description: 'Provider ID from the providers list.' };

export const LINK_HANDOFF_TOOLS: Tool[] = [
  tool(
    'show_treatment_options',
    "Show a 'Your options' card with 1 to 3 treatments that fit what the guest has told you, each with a one-line reason written for this guest. Use it at the end of the treatment finder, or whenever you recommend treatments. The card shows prices, downtime and promotions from the catalog, so don't repeat those. Your reply still explains, in your own words, how the option you'd start with helps their concern; the card never replaces that. A provider confirms the plan at the visit, but the explaining is yours now.",
    {
      headline: { type: 'string', maxLength: 80, description: "Optional short title, e.g. 'For a fresh glow before your wedding'." },
      options: {
        type: 'array',
        minItems: 1,
        maxItems: 3,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            service_id: serviceId,
            reason: { type: 'string', maxLength: 140, description: 'One sentence on why this fits the guest. No prices, discounts, or results promises.' },
          },
          required: ['service_id', 'reason'],
        },
      },
    },
    ['options'],
  ),
  tool(
    'show_service_card',
    'Show a card for one treatment: picture, price, duration, downtime, results, and the right booking button. Use it when the guest asks about a specific treatment. Answer their question in one or two sentences and let the card carry the details.',
    { service_id: serviceId },
    ['service_id'],
  ),
  tool(
    'compare_services',
    "Show a side-by-side comparison of 2 or 3 treatments: why each fits this guest, what it does, what it targets, price, time, downtime, and results. Use it whenever two or three treatments could fit, or the guest asks how they differ: show it in the same reply instead of offering to. Give each a one-line reason written for this guest's goal (no promises of results). The card shows the details, so your reply says which you'd lean toward for them and why.",
    {
      service_ids: { type: 'array', minItems: 2, maxItems: 3, items: serviceId },
      reasons: {
        type: 'array',
        maxItems: 3,
        description: "Why each treatment fits this guest's goal, one line each (under 140 characters).",
        items: { type: 'object', properties: { service_id: serviceId, reason: { type: 'string', maxLength: 140 } }, required: ['service_id', 'reason'] },
      },
    },
    ['service_ids'],
  ),
  tool(
    'show_provider',
    "Show a provider's card: credentials, specialties, languages, and the treatments they do. Use it when the guest asks who does a treatment or about a provider.",
    { staff_id: staffId },
    ['staff_id'],
  ),
  tool(
    'suggest_replies',
    "Offer 2 or 3 short tap-to-send replies the guest might want next, written from the guest's point of view, in the guest's language, each under 40 characters. Use it after most replies, and as answer choices for each treatment-finder question. Never put anything only the guest knows in a reply: no names, phone numbers, emails, birthdays, addresses, or health details. When you've asked for one of those, offer a different next step instead (for example \"I'd rather get a callback\").",
    { replies: { type: 'array', minItems: 1, maxItems: 3, items: { type: 'string', maxLength: 32 } } },
    ['replies'],
  ),
  tool(
    'get_booking_link',
    "Show a button to the business's online booking page, for a specific treatment or provider when possible. Use purpose 'manage' when the guest wants to reschedule or cancel an existing appointment, and purpose 'rsvp' with event_id for an event whose RSVP is online. Never paste links in your text; this button is how guests get links.",
    {
      service_id: { ...serviceId, description: 'Optional. Service ID from the catalog.' },
      staff_id: { ...staffId, description: 'Optional. Provider ID.' },
      purpose: { type: 'string', enum: ['book', 'manage', 'rsvp'], description: "'book' (default), 'manage' for reschedule and cancel, or 'rsvp' for an event." },
      event_id: { type: 'string', description: "With purpose 'rsvp': the event's id from the prompt." },
    },
  ),
  tool(
    'request_callback',
    "Prepare a callback request to the staff. Use for medical questions, complaints, group bookings, reschedules or cancellations the guest doesn't want to do online, and topics the business wants staff to handle. This shows the guest a confirmation card; the request is sent only when they tap Confirm. Don't include the guest's question or any health details.",
    {
      first_name: { type: 'string', maxLength: 50 },
      phone: { type: 'string', description: "Guest's phone number as they gave it. Code normalizes and validates it." },
      preferred_time: { type: 'string', maxLength: 60, description: "When the guest would like a call, in their words, e.g. 'weekday mornings'." },
      category: { type: 'string', enum: ['medical_question', 'reschedule', 'cancel', 'complaint', 'other'] },
    },
    ['first_name', 'phone', 'category'],
  ),
  tool(
    'request_appointment',
    "Prepare an appointment request when the guest wants a treatment and would like the team to book it. Set use_event_plan to true to request every treatment in the countdown plan shown in this chat (then service_id isn't needed). This shows the guest a confirmation card; the request is sent only when they tap Confirm. It's a request, not a booking: never say the appointment is booked or confirmed. Tell the guest the team will confirm, using the response time in the prompt.",
    {
      service_id: { ...serviceId, description: 'Service ID from the catalog. Not needed when use_event_plan is true.' },
      use_event_plan: { type: 'boolean', description: "True to request the countdown plan's treatments on its dates." },
      staff_id: { ...staffId, description: 'Optional. Provider ID, if the guest has a preference.' },
      preferred_times: { type: 'string', maxLength: 80, description: "When the guest would like to come in, in their words, e.g. 'weekday mornings next week'. Optional with a plan." },
      first_name: { type: 'string', maxLength: 50 },
      last_name: { type: 'string', maxLength: 50 },
      phone: { type: 'string', description: "Guest's phone number as they gave it. Code normalizes and validates it." },
      email: { type: 'string', description: 'Optional.' },
      slot: {
        type: 'object',
        description: 'The time the guest picked from the openings shown in this chat (show_openings): its date (YYYY-MM-DD) and time (HH:mm, 24-hour, as in the openings). Instead of preferred_times.',
        properties: { date: { type: 'string' }, time: { type: 'string' } },
        required: ['date', 'time'],
      },
    },
    ['first_name', 'last_name', 'phone'],
  ),
  tool(
    'show_urgent_help',
    "Show an approved help message with the right phone numbers. Call it immediately when a guest describes a possible problem after a treatment (swelling, pain, vision changes, signs of infection or an allergic reaction, trouble breathing), any emergency, or thoughts of self-harm or crisis. Don't book, offer booking, or take a callback in the same reply.",
    {
      kind: {
        type: 'string',
        enum: ['post_treatment', 'emergency', 'crisis'],
        description: "post_treatment: the business's urgent line. emergency: 911. crisis: the 988 Suicide and Crisis Lifeline and 911.",
      },
    },
    ['kind'],
  ),
  ...PLANNING_TOOLS(),
];

// Offered only where the spa's booking platform is connected for live openings (booking.availability).
export const OPENINGS_TOOL: Tool = tool(
  'show_openings',
  "Show the soonest real openings for a treatment, as tappable times that open the booking page. Use it instead of get_booking_link whenever you invite a booking. For a treatment that needs a consultation first, it shows the consultation's openings. Pass what you know of the guest's preferences: weekday, a specific date (YYYY-MM-DD, the spa's local date), and part of the day (time_of_day). Call it once per reply. You can't hold or book a time: the guest confirms it on the booking page.",
  {
    service_id: { ...serviceId, description: 'Service ID from the catalog.' },
    date: { type: 'string', description: 'Optional. A date the guest asked about, YYYY-MM-DD.' },
    time_of_day: { type: 'string', enum: ['morning', 'afternoon', 'evening'], description: 'Optional. The part of the day that works for the guest.' },
    weekday: { type: 'string', enum: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'weekday', 'weekend'], description: "Optional. The day of the week that works for the guest, or 'weekday' (Monday to Friday) or 'weekend'." },
  },
  ['service_id'],
);

// Countdown, care, estimate, membership, first visit (D62). Code computes; the model only chooses.
function PLANNING_TOOLS(): Tool[] {
  return [
    tool(
      'plan_event_timeline',
      "Build a countdown plan for an event with a date (a wedding, reunion, vacation, photos). Code works out when to have each treatment before the event from the spa's approved timing, keeps dates on open days, and leaves out anything that can't fit. Never make up dates yourself. Use it once you know the event date and 1 to 4 treatments that fit (use the treatment finder first if needed).",
      {
        event_date: { type: 'string', description: "The event date, YYYY-MM-DD. Work it out from the guest's words and today's date." },
        event_label: { type: 'string', maxLength: 40, description: "Short label in the guest's language, e.g. 'your wedding'." },
        service_ids: { type: 'array', minItems: 1, maxItems: 4, items: serviceId },
      },
      ['event_date', 'service_ids'],
    ),
    tool(
      'show_care_guide',
      "Show the spa's approved before, day-of, and after care for a treatment. Use it for prep and aftercare questions, like 'Can I work out after Botox?' or 'What do I do before my peel?'. Don't add advice beyond the guide.",
      { service_id: serviceId, focus: { type: 'string', enum: ['before', 'after', 'all'], description: 'Which part the guest asked about.' } },
      ['service_id'],
    ),
    tool(
      'estimate_visit',
      "Show a rough cost estimate for one or more treatments plus any add-ons. Code adds it up from current prices and promotions. It's an estimate, not a quote. Treatments priced per unit or syringe are listed but not totaled, because the provider sets the amount. Use it whenever the guest asks what a combination or visit would cost; never add prices yourself.",
      {
        service_ids: { type: 'array', minItems: 1, maxItems: 5, items: serviceId },
        add_on_ids: { type: 'array', maxItems: 3, items: { type: 'string', description: 'Add-on ID from the catalog.' } },
      },
      ['service_ids'],
    ),
    tool(
      'show_membership_savings',
      'Compare a year of paying per visit with the membership, worked out by code. Use it when a guest asks about memberships or saving money, or plans to get an included treatment regularly. If the membership would cost them more, the card says so; be honest.',
      {
        membership_id: { type: 'string', description: 'Optional; defaults to the main membership.' },
        visits_per_year: { type: 'integer', minimum: 1, maximum: 24, description: 'How often the guest expects to come; default 12.' },
      },
    ),
    tool(
      'show_first_visit',
      "Show the first-visit card: when to arrive, parking, what to bring, and the new-guest form button. Use it for questions about a first visit, parking, what to bring, or forms.",
      {},
    ),
  ];
}

// Staff mode (D64): reference and coaching tools only; no requests or bookings.
export const STAFF_TOOLS: Tool[] = [
  ...LINK_HANDOFF_TOOLS.filter((t) =>
    ['show_service_card', 'compare_services', 'show_provider', 'suggest_replies', 'show_care_guide', 'estimate_visit', 'show_membership_savings', 'show_first_visit'].includes(
      t.toolSpec?.name ?? '',
    ),
  ),
  tool(
    'show_unanswered_questions',
    "Show this month's report of questions the concierge couldn't answer, services visitors asked for that the spa doesn't offer, and top topics. Use it when the team asks what visitors are asking about or what's missing.",
    {},
  ),
];
