/*
 * The wizard's fixed wording: option lists, sample replies, and the phrases
 * the preview is built from. Carried over from the prototype as written.
 *
 * `{short}` is the spa's short name and is filled in when shown. The other
 * `{…}` placeholders are filled by voice.ts from the spa's answers.
 */

export const FEEL=["Calm","Pampered","Confident","Excited","Cared for","In expert hands","Like talking to a friend","Like talking to a doctor","Luxurious","Like a VIP","Discreet","Empowered","Welcomed","Informed"];

export const NAME_STYLES=[
 {v:"first",t:"A friendly first name",d:"Warm and personal. It always introduces itself as AI.",eg:"Sophie, Mila"},
 {v:"brand",t:"A name tied to your brand",d:"Inspired by your spa’s name, neighborhood, or story.",eg:"Ava from {short}"},
 {v:"title",t:"A descriptive title",d:"Clear and polished. Never feels like it’s pretending to be a person.",eg:"The {short} Concierge"},
 {v:"generic",t:"No name, keep it generic",d:"It introduces itself simply as your AI Treatment Coordinator.",eg:"AI Treatment Coordinator"},
 {v:"suggest",t:"Suggest some for us",d:"We’ll generate ideas from the feelings you picked."}];

export const FALLBACK_NAMES: Record<string, [string, string][]> ={
 first:[["Sophie","Soft and familiar, easy to say"],["Mila","Light and modern"],["Nora","Calm and grounded"],["Elise","Polished with a warm edge"],["Ivy","Fresh, botanical, memorable"],["Claire","Clear and reassuring"]],
 brand:[["Ava from {short}","Pairs a warm name with your brand"],["Lumi","A playful nod to {short}"],["Lux","Echoes light and luxury"],["Aura","Matches a glow-focused brand"],["Wren","Short, gentle, distinctive"],["Celeste","Bright and elegant"]],
 title:[["The {short} Concierge","Polished and service-forward"],["Your Glow Guide","Friendly and outcome-focused"],["{short} Care Coordinator","Clear about its role"],["The {short} Desk","Simple, like your front desk"],["Your Skin Concierge","Elevated and personal"],["{short} Assistant","Plain and direct"]]};

export const ICONS: [string, string][] =[["sparkle","Sparkle"],["bubble","Chat bubble"],["leaf","Leaf"],["droplet","Droplet"],["syringe","Syringe"],["serum","Serum bottle"],["jar","Cream jar"]];

export const TONES=[
 {v:"warm",t:"Warm and casual",d:"Like texting a friend who works there."},
 {v:"balanced",t:"Balanced",d:"Friendly, clear, and professional."},
 {v:"polished",t:"Polished",d:"Elevated and precise, like a luxury concierge."}];

export const TONE_TEXT: Record<string, string[]> ={
 "warm":["Totally fair question{!}","Most {guests} say it feels like a quick pinch, and it’s over in a few minutes{e}.","Our {providers} can use ice or numbing to keep you comfy.","Want me to help you {book}?"],
 "warm-bal":["Great question{!}","Most {guests} feel a quick pinch, and treatment only takes a few minutes.","Our {providers} can use ice or numbing for extra comfort.","Would you like help to {book}?"],
 "balanced":["Good question.","Most {guests} feel a brief pinch, and treatment takes just a few minutes.","Our {providers} can use ice or numbing for extra comfort.","Would you like help to {book}?"],
 "bal-pol":["Thank you for asking.","Discomfort is typically brief, and treatment takes only a few minutes.","Our {providers} offer comfort options such as ice or topical numbing.","May I help you {book}?"],
 "polished":["Thank you for your question.","Discomfort is typically minimal and brief, and treatment takes only a few minutes.","Our {providers} offer comfort options, including ice and topical numbing.","May I assist you in scheduling?"]};

export const TERMS: Record<string, [string, string][]> ={
 guests:[["guests","Guests"],["patients","Patients"],["clients","Clients"],["customers","Customers"]],
 treatments:[["treatments","Treatments"],["procedures","Procedures"],["services","Services"]],
 providers:[["providers","Providers"],["injectors","Injectors"],["estheticians","Estheticians"],["team","Team"]],
 book:[["book a consult","Book a consult"],["schedule a visit","Schedule a visit"],["book an appointment","Book an appointment"]]};

export const SINGULAR: Record<string, string> ={customers:"customer",guests:"guest",patients:"patient",clients:"client",treatments:"treatment",procedures:"procedure",services:"service",providers:"provider",injectors:"injector",estheticians:"esthetician",team:"team member"};

export const GREETINGS=["Hi there{!} {disclosure} What can I help you with today?","Welcome to {spa}{!} {disclosureYour} Ask me anything about our {treatments}, pricing, or booking.","Hello, and thanks for stopping by. {disclosure} A real person on our team is always a message away. How can I help?"];

export const DISCLOSURES=["I’m {name}, {spa}’s AI Treatment Coordinator.","I’m {name}, the AI Treatment Coordinator for {spa}.","I’m {name}, {spa}’s AI Treatment Coordinator. A real person on our team is always a message away."];

export const DONTKNOW=["That’s a great one for our team.","I want to make sure you get the right answer, so let me connect you with our team.","I don’t have that answer, but our team does."];

export const SIGNOFFS=["Talk soon{!}","We can’t wait to see you{!}","Have a lovely day."];

/* Realistic portraits, AI-generated (D45). Never a real staff member, and the
   coordinator's label always says it's AI wherever the face appears. */
export const PORTRAITS = Array.from({ length: 8 }, (_, i) => `/onboarding/portraits/look-${i + 1}.jpg`)

/* English first, then Spanish once its evals pass (D47). No other languages
   until the concierge is tested in them. */
export const LANGS = ['English', 'Spanish']

/* How a price is said. Exact prices come from the price list the spa keeps in
   its Hub, not live from booking software, which link mode can't read (D72). */
export const PRICING = [
  { v: 'exact', t: 'Exact prices, from your price list', r: 'Lip filler is $725 per syringe.' },
  { v: 'starting', t: '“Starting at” ranges', r: 'Lip filler starts at $650, depending on the product and amount.' },
  { v: 'never', t: 'Never quote, invite a consult', r: 'Pricing depends on your goals and the amount used, so our {providers} give exact quotes at a consult.' },
] as const

export const NEVER = [
  'We never guarantee results',
  'We never say “painless” or “no pain”',
  'We never mention competitor names',
  'We never make FDA claims for uses a product isn’t approved for',
  'We never say “cheap” or “discount”',
  'We never say anything that sounds like a diagnosis',
  'We never ask a patient’s medical history',
]

/* Which sounds like you? Each pair is the same reply in two styles; the
   choices set the voice without anyone having to write. `sets` names what a
   pair decides, for the voice profile. */
export const PAIRS: { g: string; a: string; b: string; sets: string }[] = [
  { sets: 'Warmth', g: 'Hi! Do you have anything open Saturday?', a: 'Hi there! Let me help you find a time. What are you thinking of coming in for?', b: 'Saturday availability depends on the service. Which treatment are you interested in?' },
  { sets: 'Length', g: 'What’s a HydraFacial?', a: 'It’s a deep-cleansing facial that exfoliates, extracts, and hydrates in about 30 minutes, with no downtime.', b: 'It’s a facial that cleans and hydrates your skin in one step. Quick, and no downtime.' },
  { sets: 'Emoji', g: 'Thank you so much!', a: 'You’re so welcome! 😊 We can’t wait to see you.', b: 'You’re very welcome. We look forward to seeing you.' },
  { sets: 'How directly to book', g: 'I’m thinking about Botox.', a: 'Great choice! Would you like help booking a consult?', b: 'Happy to help you think it through. Is there an area you’re most focused on?' },
  { sets: 'Formality', g: 'Who does the injections?', a: 'Our injectors do! They’re licensed and super experienced, and they’ll walk you through everything.', b: 'All injections are performed by our licensed injectors, who will review your goals with you first.' },
  { sets: 'Reassurance', g: 'I’m really nervous about needles.', a: 'That’s so normal, and you’re definitely not alone. We’ll go at your pace and keep you comfortable.', b: 'Many guests feel the same way. We offer comfort options such as numbing cream and ice.' },
  { sets: 'Talking about price', g: 'Why is it more than other places?', a: 'Totally fair question! You’re paying for experienced injectors and natural-looking results.', b: 'Our pricing reflects our providers’ training and the products we use. A consult gives you an exact quote.' },
  { sets: 'Follow-up questions', g: 'Do you do lip filler?', a: 'We do! Are you looking for subtle volume or more definition?', b: 'Yes, we do. Would you like pricing, or help booking a consult?' },
  { sets: 'Following up', g: 'Okay, I’ll think about it.', a: 'Of course, no rush at all. I’m here whenever you’re ready.', b: 'Sounds good. Would it help if I sent you a few times that are open this week?' },
  { sets: 'Playfulness', g: 'Can Botox make me look 25 again?', a: 'We can’t turn back the clock, but we can definitely soften it a little!', b: 'Results vary from person to person. A consult is the best way to set realistic expectations.' },
]

/* Typed by the team: their own words, which become voice examples. */
export const QUICK = [
  'How much is lip filler?',
  'I’m nervous, it’s my first time.',
  'Can I book for this Saturday?',
  'That’s more than I wanted to spend.',
  'Do you have any specials right now?',
]

/* Handoffs. Contact details are always collected on a card the guest fills
   in, never typed into the chat (D35, D52), so the wording invites the card. */
export const HANDOFF: Record<string, { t: string; g: string; o: string[] }> = {
  cant: { t: 'A question it can’t answer', g: 'Can I use my HSA card for Botox?', o: ['That’s a great one for our team. Can I have someone reach out to you?', 'I don’t have that answer, but our team does. Would you like them to follow up?', 'I’d rather get you the right answer than guess. Can I have our team follow up with you?'] },
  medical: { t: 'A medical question', g: 'Is Botox safe if I’m on blood thinners?', o: ['That’s a great question for one of our {providers}, and I want to make sure you get the right answer. Can I have someone from our clinical team follow up within {C}?', 'I’m not able to give medical advice, but our {providers} can answer that at a consult or by phone. Would you like them to reach out within {C}?'] },
  notoffered: { t: 'A request for a service that’s not offered, or a concern with no matching service', g: 'Do you do PRP for hair loss?', o: ['That’s not something we offer right now, but our team can talk through options that might help. Can I have someone reach out to you?', 'We don’t offer that here, but I’d love to connect you with our team to find the best fit for your goals. Would you like them to follow up?'] },
  consult: { t: 'When a consult is required', g: 'Can I book lip filler for Saturday?', o: ['Great choice{!} For lip filler, we start with a quick consult so your {provider} can create the right plan for you. Would you like to {book}?', 'We always begin with a consult for this one, so your {provider} can make sure it’s the right fit. Would you like me to help you {book}?'] },
  callback: { t: 'A callback request', g: 'Can someone call me?', o: ['Absolutely. Share your number and a good time below, and our team will call within {C}.', 'Happy to set that up. Our team will call you back within {C}.'] },
  complaint: { t: 'A complaint', g: 'I’m not happy with my results.', o: ['I’m really sorry to hear that. I want our team to make this right, so I’m passing this to our manager. They’ll reach out within {C}.', 'Thank you for telling us. This deserves a real person’s attention, so I’m sharing it with our team now. Expect to hear back within {C}.'] },
}

/* Custom handoff wording that promises a faster reply than the spa commits to. */
export const FAST = /\b(minutes?|hours?|right away|immediately|asap|today|tonight|shortly|same[- ]day)\b/i

export const TIER_DEFAULTS = {
  t1: ['Difficulty breathing', 'Throat or tongue swelling', 'Chest pain', 'Fainting', 'Sudden vision changes'],
  t2: ['Skin turning white, gray, or blue near an injection site', 'Severe or worsening pain', 'Signs of infection', 'Unusual swelling'],
  s1: 'Please call 911 now or go to the nearest emergency room. These symptoms need immediate medical care. Once you’re safe, let us know at {urgent}.',
  s2: 'Please call our urgent line now at {urgent}. A member of our clinical team will help you right away. If symptoms get worse or you have trouble breathing, call 911.',
}
/** The same, for a spa with no injectables (an esthetician's studio): no injection-site
    symptom, and no clinical team on call. */
export const TIER_DEFAULTS_SKIN = {
  ...TIER_DEFAULTS,
  t2: ['Severe or worsening pain', 'Signs of infection', 'Blistering or open skin', 'Unusual swelling or a rash that spreads'],
  s2: 'Please contact us right away at {urgent}, and we’ll help you as soon as we can. If symptoms get worse or you have trouble breathing, call 911.',
}
/** Treatments that are injected, by name or category. */
export const INJECTABLE = /botox|dysport|xeomin|daxxify|jeuveau|neurotox|filler|inject|kybella|sculptra|radiesse|prp/i

/* ---------- Part 2: the Sales Playbook ----------
   From the prototype, with 09-intake-wizard.md §4.1 applied (D72): no
   "urgency allowed"; discounts only as a promotion the spa chose; contact
   details only on a card, so the choice is when to offer a booking or
   callback, not when to ask for a phone number. */

export const PRIORITY: [string, string][] = [['high', 'High'], ['normal', 'Normal'], ['none', 'Don’t promote']]
export const WHY = ['High margin', 'New', 'Underbooked', 'Signature']
export const PWHY = ['Bestseller', 'High margin', 'New', 'Overstock']
export const SVC_CATS = ['Injectables', 'Facials', 'Laser', 'Skin treatments', 'Body', 'Wellness']
export const PROD_CATS = ['Sunscreen', 'Serums', 'Moisturizers', 'Cleansers', 'Eye care', 'Lip care', 'Body care']

/** Per-service price display. "Default" follows the Part 1 rule. */
export const PRICE_OVR: [string, string][] = [
  ['default', 'Use my default'], ['exact', 'Exact price, from your price list'], ['starting', 'Starting at'], ['never', 'Priced at consultation'],
]

/** Common pairings, pre-filled for the spa to confirm when both services exist. */
export const PAIRINGS: Record<string, string[]> = {
  Botox: ['HydraFacial'], 'Lip filler': ['Botox'], HydraFacial: ['Chemical peel'], Microneedling: ['HydraFacial'],
}

/** Concerns guests describe, with the services spas usually lead with. */
export const CONCERNS: [string, string[]][] = [
  ['Acne and breakouts', ['HydraFacial', 'Chemical peel']], ['Acne scars', ['Microneedling', 'Microchanneling', 'Chemical peel']],
  ['Fine lines and wrinkles', ['Botox', 'Microneedling', 'Microchanneling']], ['Thin lips', ['Lip filler']], ['Hair thinning and loss', ['HydraScalp', 'Hair Restoration']],
  ['Redness and pigmentation', ['HydraFacial']], ['Sun damage and dark spots', ['Chemical peel', 'Microneedling']],
  ['Texture and large pores', ['Microneedling', 'Microchanneling', 'HydraFacial']], ['Dull skin', ['HydraFacial', 'Chemical peel']],
  ['Unwanted hair', ['Laser hair removal']], ['Under-eye hollows and dark circles', []], ['Loose or sagging skin', []],
  ['Active cold sore or infection', []], ['Recent sun exposure or tanning', []],
]

/**
 * Concern Logic's sample reply: a warm opener for each concern, then why the
 * first suggested treatment helps. Preview wording only (the chat writes its
 * own from the spa's treatment pages), so it stays modest: "can help", never
 * a promise.
 */
export const CONCERN_OPEN: Record<string, string> = {
  'Acne and breakouts': 'I’m so sorry you’re dealing with that{!} Breakouts can be really frustrating.',
  'Acne scars': 'I’m so sorry you’re dealing with that. Scarring can really stick with you, and you’re not alone.',
  'Fine lines and wrinkles': 'That’s one of the most common things we help with{!}',
  'Thin lips': 'We love helping with that{!}',
  'Hair thinning and loss': 'I’m sorry you’re dealing with that. It’s more common than most people think.',
  'Redness and pigmentation': 'I’m sorry you’re dealing with that{!} Redness and uneven tone can be so frustrating.',
  'Sun damage and dark spots': 'That’s so common, and there’s a lot we can do{!}',
  'Texture and large pores': 'That’s one of the most common things we help with{!}',
  'Dull skin': 'We hear that a lot, and it’s very fixable{!}',
  'Unwanted hair': 'We can definitely help with that{!}',
  'Under-eye hollows and dark circles': 'That’s such a common concern, and you’re not alone.',
  'Loose or sagging skin': 'That’s a really common concern, and you’re not alone.',
}
/** Why a treatment helps, matched on words in the spa's own service name. */
export const TREAT_WHY: [RegExp, string][] = [
  [/hydra ?facial/i, 'it deep-cleans pores, gently exfoliates, and hydrates the skin, with no downtime'],
  [/peel/i, 'it lifts away dull, damaged surface skin, so tone and texture look more even'],
  [/hydra ?scalp|scalp/i, 'it deep-cleans the scalp and infuses peptides and growth factors that support healthier-looking hair'],
  [/microchannel/i, 'it creates tiny channels so a growth-factor serum reaches deeper, supporting collagen and smoother, firmer-looking skin'],
  [/enzyme/i, 'it boosts circulation and helps calm inflammation and balance oil, so skin looks clearer and healthier'],
  [/infusion|nano ?fusion/i, 'it delivers high-dose active ingredients deep into the skin, with no acids and no downtime'],
  [/lift|banding|sculpt/i, 'it firms, lifts, and tones the skin for a more sculpted look, with no downtime'],
  [/microneedl/i, 'it prompts your skin to build fresh collagen, which can smooth texture and soften scars and lines over a few sessions'],
  [/botox|dysport|xeomin|daxxify|jeuveau|neurotox/i, 'it relaxes the muscles that cause expression lines, so they soften and look more rested'],
  [/lip/i, 'it adds soft, natural-looking volume and shape, tailored to your features'],
  [/filler/i, 'it restores lost volume, so the area looks smoother and more refreshed'],
  [/laser hair|hair removal/i, 'it targets hair at the root, for long-lasting smoothness after a series of sessions'],
  [/ipl|photofacial|bbl/i, 'it targets redness and brown spots with light, so skin looks clearer and more even'],
  [/dermaplan/i, 'it gently removes dead skin and peach fuzz, so skin looks brighter right away'],
  [/led|light therapy/i, 'it uses gentle light to calm the skin and support healing, with no downtime'],
  [/prp|prf/i, 'it uses your body’s own growth factors to support healthier hair and skin over time'],
  [/rf|radiofrequency|morpheus|tightening/i, 'it gently heats the deeper layers of skin to encourage firming over time'],
  [/facial/i, 'it deep-cleans, exfoliates, and nourishes your skin, tailored to what it needs that day'],
]

export const DIFFS = ['Years in business', 'Medical director credentials', 'Provider experience', 'Natural-looking results',
  'Comfort-first approach', 'Transparent pricing', 'Advanced technology', 'Personalized plans']

/** Each approach: [value, label, sample wording]. {promo} is the spa's running offer. */
export const OBJ: Record<string, { t: string; g: string; o: [string, string, string][] }> = {
  price: { t: 'Price', g: 'That seems expensive.', o: [
    ['value', 'Emphasize value and expertise', 'That’s fair, and it’s a real investment. Our {providers} have advanced training, and we focus on results that look natural.'],
    ['financing', 'Mention financing or memberships', 'We offer monthly financing, and our memberships can lower the cost of every visit.'],
    ['consult', 'Invite a consult for an exact quote', 'Every plan is different, so a consult is the best way to get an exact quote with no pressure.'],
    ['promo', 'Mention a current promotion', 'Good timing, too: {promo}.'],
  ] },
  pain: { t: 'Pain', g: 'I’m worried it’ll hurt.', o: [
    ['comfort', 'Describe comfort measures', 'We use numbing cream and ice, and most {guests} describe it as a quick pinch.'],
    ['normalize', 'Normalize and reassure', 'That’s one of the most common worries we hear, and you’re in good hands. Our {providers} go at your pace.'],
    ['consult', 'Invite a consult', 'If it helps, you can meet your {provider} at a consult first and talk through comfort options.'],
  ] },
  downtime: { t: 'Downtime', g: 'I can’t have much downtime.', o: [
    ['timelines', 'Share approved general timelines', 'Many {guests} go right back to their day, and our team shares approved aftercare for each {treatment}.'],
    ['events', 'Suggest timing around events', 'If you have an event coming up, we can help you plan timing so you feel your best.'],
    ['consult', 'Invite a consult', 'Your {provider} can walk you through what to expect for your plan at a consult.'],
  ] },
  results: { t: 'Results', g: 'How do I know it’ll work for me?', o: [
    ['reviews', 'Point to reviews', 'You can read real reviews from our {guests} on our website.'],
    ['expect', 'Set realistic expectations', 'Results vary, and our {providers} are honest about what’s realistic for your goals.'],
    ['consult', 'Invite a consult', 'A consult is the best way to talk through your goals and what’s realistic for you.'],
  ] },
}

export const TACTICS: Record<string, { t: string; hint?: string; o: [string, string][] }> = {
  discount: { t: 'Promotions', hint: 'Your coordinator only ever offers promotions from the Promotions screen. It never makes up a discount.', o: [
    ['never', 'Never mention promotions'], ['asked', 'Mention promotions only when asked'],
    ['proactive', 'Mention promotions when they fit'], ['hesitate', 'When someone hesitates, offer a promotion I choose'],
  ] },
  offer: { t: 'When to offer an appointment request or callback', hint: 'Guests share their details on a short contact card, never by typing them into the chat.', o: [
    ['early', 'Early in the conversation'], ['answered', 'After answering their first question'], ['asked', 'Only when they ask'],
  ] },
  push: { t: 'How often to suggest booking', o: [
    ['most', 'In most replies'], ['educate', 'Educate first, then suggest booking'], ['asked', 'Only when the guest asks'],
  ] },
  urgency: { t: 'Urgency', hint: 'Invented scarcity, like “spots are filling up,” is never used.', o: [
    ['never', 'Never use urgency'], ['real', 'Only real limits, like a promotion’s end date'],
  ] },
}

/* ---------- Part 3: the role-play ----------
   A made-up guest messages the spa's team; they reply as they would in a DM.
   `next` is the guest's script, used until the AI guest is switched on (step
   4, Bedrock), and as its fallback after. Replies are tone samples only. */
export const SCENARIOS: { id: string; t: string; open: string; next: string[]; lang?: string }[] = [
  { id: 'price', t: 'Price question, then an objection', open: 'Hi! How much is Botox?', next: ['Hmm, that seems kind of expensive.', 'Okay. Is there anything that makes it more affordable?'] },
  { id: 'pain', t: 'Nervous about pain', open: 'I’ve always wanted lip filler but I’m really scared of needles.', next: ['How bad is it, honestly?', 'What happens if I get nervous during it?'] },
  { id: 'event', t: 'Event deadline', open: 'I’m getting married in three weeks. What can I do to look my best?', next: ['Is three weeks enough time?', 'Can I do more than one thing?'] },
  { id: 'first', t: 'First-timer', open: 'I’ve never done anything like this. Where do I even start?', next: ['I mostly just want to look less tired.', 'How do I know what to book?'] },
  { id: 'minor', t: 'Not a good fit', open: 'Hi, I’m 17. Can I get lip filler if my mom comes with me?', next: ['What if I wait until my birthday in two months?'] },
  { id: 'compare', t: 'Comparing to a competitor', open: 'The place down the street is $9 a unit. Why are you more?', next: ['Do you price match?'] },
  { id: 'upsell', t: 'Adding another service', open: 'I’m coming in for Botox next week. Is there anything else I should add while I’m there?', next: ['How much would that add?', 'Okay, can you add it?'] },
  { id: 'member', t: 'Membership or package question', open: 'Is your membership actually worth it?', next: ['What if I only come in a few times a year?'] },
  { id: 'spanish', t: 'Spanish-speaking guest', open: 'Hola, ¿cuánto cuesta el relleno de labios?', next: ['¿Tienen citas este sábado?'], lang: 'Spanish' },
]
