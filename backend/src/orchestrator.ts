// The conversation loop (build plan 3.3): clean the message, call Claude, validate and run tools,
// check the reply, and fall back to a booking link when anything fails.
import { randomUUID } from 'node:crypto';
import type { ContentBlock, Message, SystemContentBlock } from '@aws-sdk/client-bedrock-runtime';
import type {
  FeedbackRequest,
  Card,
  ConfirmResponse,
  Lang,
  MessageRequest,
  MessageResponse,
  PublicConfig,
  Reply,
  SessionState,
} from '@concierge/shared';
import { copyForPage, forPage } from '@concierge/shared';
import { type Catalog, localClock, pick } from './catalog.ts';
import { checkText } from './checks/output.ts';
import { redactCardNumbers } from './safety/cardNumbers.ts';
import { detectSafetyNet } from './safety/emergency.ts';
import { MAX_REPLY_CHARS } from './checks/output.ts';
import { LINK_HANDOFF_TOOLS, STAFF_TOOLS } from './tools/definitions.ts';
import { firstVisitCard, handleTool, urgentCard, type ToolContext } from './tools/handlers.ts';
import { buildSystem, fixedBlock, staffFixedBlock } from './prompt.ts';
import { strings } from './i18n.ts';
import { appointmentEmail, callbackEmail, type Outbox } from './handoff/email.ts';
import type { ModelClient } from './model/bedrock.ts';
import type { Session } from './session/store.ts';
import { log } from './log.ts';

export const MAX_MESSAGES = 30;
export const MAX_INPUT_CHARS = 2000;
const MAX_TOOL_ROUNDS = 4;
// Tools that only put a card or chips on screen. When the model has already written its reply and
// calls only these, the turn ends there: asking it to go on after the results makes it write the
// same point again in other words.
const DISPLAY_ONLY = new Set([
  'show_treatment_options',
  'show_service_card',
  'compare_services',
  'show_provider',
  'suggest_replies',
  'get_booking_link',
  'show_care_guide',
  'show_first_visit',
]);
const ACTION_TTL_MS = 30 * 60 * 1000;

export interface OrchestratorDeps {
  catalog: Catalog;
  model: ModelClient;
  outbox: Outbox;
  phoneKey: string;
  now?: () => Date;
  insights?: (lang: Lang) => Promise<Card>; // staff mode report (D65)
}

interface TurnResult {
  added: Message[]; // messages appended after the input
  text: string;
  cards: Card[];
  quickReplies: string[];
  urgent: boolean;
  completed: boolean; // false if the tool-round limit was hit
  // False when the model ended with an empty message after a tool result (it had already said
  // everything). Empty messages aren't valid history, so the turn ends on the tool-result message.
  endsWithAssistant: boolean;
}

// A localized config string for both languages (Spanish falls back to English).
const allLangs = (v: string | { en: string; es?: string }) => (typeof v === 'string' ? { en: v, es: v } : { en: v.en, es: v.es ?? v.en });
// Page copy may say {name}, so it stays right when the spa renames its coordinator.
const named = (m: { en: string; es: string }, name: string) => ({ en: m.en.replaceAll('{name}', name), es: m.es.replaceAll('{name}', name) });

// The model often writes its answer, calls a tool (a card, a contact form), then writes the answer
// again in other words. Keep the later version of any part that a later part repeats, so the guest
// reads it once; parts that say different things are all kept.
const words = (t: string) => new Set(t.toLowerCase().match(/[a-z0-9']+/g) ?? []);
function similar(a: string, b: string): boolean {
  const x = words(a), y = words(b);
  if (!x.size || !y.size) return false;
  let both = 0;
  for (const w of x) if (y.has(w)) both++;
  return both / Math.min(x.size, y.size) >= 0.6;
}
export function joinReplies(texts: string[]): string {
  const parts = texts.filter(Boolean);
  return parts.filter((t, i) => !parts.slice(i + 1).some((later) => similar(t, later))).join('\n\n');
}

export class Orchestrator {
  private readonly fixed: string;
  private readonly staffFixed: string;

  constructor(private readonly deps: OrchestratorDeps) {
    this.fixed = fixedBlock(deps.catalog);
    this.staffFixed = staffFixedBlock(deps.catalog);
  }

  private check(text: string, today: string, ctx: ToolContext) {
    return checkText(text, this.catalog, today, MAX_REPLY_CHARS, ctx.extraAmounts, ctx.session.audience);
  }

  private get catalog() {
    return this.deps.catalog;
  }

  private clock() {
    const tz = this.catalog.config.business.locations[0]!.timezone;
    return localClock(tz, this.deps.now ? this.deps.now() : new Date());
  }

  private lang(requested: string | undefined, fallback: Lang): Lang {
    return requested === 'en' || requested === 'es' ? (this.catalog.config.languages.includes(requested) ? requested : fallback) : fallback;
  }

  // available is false while the kill switch is on (D43).
  publicConfig(available = true): PublicConfig {
    const c = this.catalog.config;
    const both = (m: { en: string; es?: string }) => ({ en: m.en, es: m.es ?? m.en });
    const qs = c.display.suggested_questions;
    return {
      clientId: c.client_id,
      available,
      demo: c.demo,
      businessName: c.business.name,
      phone: c.business.phone,
      bookingUrl: c.booking.direct_links.default,
      concierge: {
        name: c.concierge.name,
        initials: c.concierge.name.slice(0, 1).toUpperCase(),
        avatarMode: c.concierge.avatar.mode,
        ...(c.concierge.avatar.mode === 'portrait' && c.concierge.avatar.id ? { avatarUrl: `/avatars/${c.concierge.avatar.id}.jpg` } : {}),
        disclosureLabel: both(c.concierge.disclosure_label),
      },
      notice: { version: c.concierge.chat_notice.version, text: both(c.concierge.chat_notice), privacyUrl: c.business.privacy_policy_url },
      branding: { colors: c.branding.colors, fonts: { heading: c.branding.fonts.heading, body: c.branding.fonts.body } },
      languages: c.languages,
      suggested: {
        default: qs ? { en: qs.default.en, es: qs.default.es ?? qs.default.en } : { en: [], es: [] },
        pages: Object.fromEntries(Object.entries(qs?.pages ?? {}).map(([path, q]) => [path, { en: q.en, es: q.es ?? q.en }])),
      },
      display: {
        modes: c.display.modes,
        nudgeDelaySeconds: c.display.nudge_delay_seconds,
        pages: Object.fromEntries(
          Object.entries(c.display.pages).map(([path, p]) => [
            path,
            {
              ...(p.greeting ? { greeting: named(allLangs(p.greeting), c.concierge.name) } : {}),
              ...(p.placeholder ? { placeholder: allLangs(p.placeholder) } : {}),
              ...(p.topic ? { topic: allLangs(p.topic) } : {}),
            },
          ]),
        ),
      },
      promotions: this.catalog.activePromotions(this.clock().date).map((p) => ({ id: p.id, label: p.description, ends: p.ends })),
      hours: c.business.locations[0]!.hours,
      timezone: c.business.locations[0]!.timezone,
      staff: c.staff_mode
        ? { enabled: c.staff_mode.enabled, suggested: { en: c.staff_mode.suggested.en, es: c.staff_mode.suggested.es ?? c.staff_mode.suggested.en } }
        : undefined,
    };
  }

  greetStaff(session: Session): Reply {
    const staff = this.catalog.config.staff_mode;
    const reply: Reply = {
      text: strings(session.lang).staffGreeting(this.catalog.config.concierge.name),
      cards: [],
      quickReplies: staff ? (session.lang === 'es' ? staff.suggested.es ?? staff.suggested.en : staff.suggested.en) : [],
    };
    session.display.push({ role: 'assistant', ...reply });
    return reply;
  }

  private suggested(page: string | undefined, lang: Lang): string[] {
    const cfg = this.publicConfig().suggested;
    return forPage(cfg.pages, page)?.[lang] || cfg.default[lang];
  }

  greet(session: Session): Reply {
    // The page's own greeting when the spa wrote one (the ask bar showed it before the guest asked).
    const pageGreeting = copyForPage(this.catalog.config.display.pages, session.page)?.greeting;
    const reply: Reply = {
      text: pageGreeting
        ? named(allLangs(pageGreeting), this.catalog.config.concierge.name)[session.lang]
        : pick(this.catalog.config.concierge.greeting, session.lang),
      cards: [],
      quickReplies: this.suggested(session.page, session.lang),
    };
    session.display.push({ role: 'assistant', ...reply });
    return reply;
  }

  state(session: Session | undefined): SessionState {
    if (!session) return { active: false, lang: 'en', history: [] };
    return { active: true, lang: session.lang, history: session.display, audience: session.audience };
  }

  private fallback(lang: Lang): Reply {
    const S = strings(lang);
    return {
      text: S.fallback,
      cards: [{ type: 'booking_link', purpose: 'book', url: this.catalog.config.booking.direct_links.default }],
      quickReplies: [],
    };
  }

  // Thumbs up or down on one of this chat's replies (build plan 9.5). False if there's no such reply.
  rate(session: Session, req: FeedbackRequest): boolean {
    const m = session.display.find((d) => d.role === 'assistant' && d.replyId === req.replyId);
    if (!m) return false;
    m.feedback = req.rating === 'down' && req.reason ? { rating: 'down', reason: req.reason } : { rating: req.rating };
    log('feedback', { session: session.hash.slice(0, 8), status: req.rating, kind: req.reason });
    return true;
  }

  // The reply while another request is still working on this session.
  busyReply(lang: Lang): MessageResponse {
    return { reply: { text: strings(lang).busy, cards: [], quickReplies: [] } };
  }

  async handleMessage(session: Session, req: MessageRequest): Promise<MessageResponse> {
    if (session.busy) return this.busyReply(session.lang);
    if (session.seenMessageIds.has(req.id)) {
      // A retried request: return the reply we already gave rather than answering twice.
      const last = [...session.display].reverse().find((m) => m.role === 'assistant');
      return { reply: { replyId: last?.replyId, text: last?.text ?? '', cards: last?.cards ?? [], quickReplies: last?.quickReplies ?? [] } };
    }
    session.busy = true;
    try {
      return await this.turn(session, req);
    } finally {
      session.busy = false;
    }
  }

  private async turn(session: Session, req: MessageRequest): Promise<MessageResponse> {
    session.seenMessageIds.add(req.id);
    session.lang = this.lang(req.lang, session.lang);
    if (req.page) session.page = req.page.slice(0, 200);
    const lang = session.lang;
    const S = strings(lang);

    session.counts.messages += 1;
    if (session.counts.messages > MAX_MESSAGES) {
      const reply = { ...this.fallback(lang), text: S.messageLimit(this.catalog.config.business.phone) };
      return { reply, limitReached: true };
    }

    // Clean the message before the model, storage, or logs see it (D33).
    const { text: noCards } = redactCardNumbers(req.text.slice(0, MAX_INPUT_CHARS));
    const clean = noCards.replace(/<\/?\s*concierge_[a-z_]*[^>]*>/gi, '').trim();
    const userContent: ContentBlock[] = [];
    if (session.events.length) {
      userContent.push({ text: session.events.map((e) => `<concierge_event>${e}</concierge_event>`).join('\n') });
      session.events = [];
    }
    userContent.push({ text: clean || '(empty message)' });
    // If the last turn ended on a tool-result message, this message joins it so roles keep alternating.
    const prior = session.modelMessages;
    const lastPrior = prior[prior.length - 1];
    const turnMessages: Message[] =
      lastPrior?.role === 'user'
        ? [...prior.slice(0, -1), { role: 'user', content: [...(lastPrior.content ?? []), ...userContent] }]
        : [...prior, { role: 'user', content: userContent }];

    const clock = this.clock();
    const staff = session.audience === 'staff';
    const system = buildSystem(this.catalog, { clock, lang, page: session.page }, staff ? this.staffFixed : this.fixed);
    // Tools run synchronously, so the staff report is read before the turn.
    const report = staff && this.deps.insights ? await this.deps.insights(lang) : undefined;
    const ctx: ToolContext = {
      catalog: this.catalog,
      session,
      lang,
      today: clock.date,
      phoneKey: this.deps.phoneKey,
      extraAmounts: new Set(),
      insights: report ? () => report : undefined,
    };

    let reply: Reply;
    let stored: Message[];
    try {
      const first = await this.runTurn(system, turnMessages, ctx);
      let check = withConsistency(this.check(first.text, clock.date, ctx), first);
      let final = first;
      stored = [...turnMessages, ...first.added];

      if (first.completed && !check.ok) {
        log('output_check_failed', { session: session.hash.slice(0, 8), check: check.problems.length.toString(), count: 1 });
        const beforeFinal = first.endsWithAssistant ? first.added.slice(0, -1) : first.added;
        const retryInput = withFeedback([...turnMessages, ...beforeFinal], check.problems);
        const retry = await this.runTurn(system, retryInput, ctx);
        final = { ...retry, cards: [...first.cards, ...retry.cards], quickReplies: retry.quickReplies.length ? retry.quickReplies : first.quickReplies, urgent: first.urgent || retry.urgent };
        check = withConsistency(this.check(retry.text, clock.date, ctx), final);
        stored = [...turnMessages, ...beforeFinal, ...retry.added];
      }

      if (!final.completed || !check.ok || (!final.text && final.cards.length === 0)) {
        session.counts.fallbacks += 1;
        log('reply_fallback', { session: session.hash.slice(0, 8), status: final.completed ? 'check_failed' : 'tool_limit' });
        const fb = this.fallback(lang);
        reply = { text: fb.text, cards: [...final.cards.filter((c) => c.type !== 'booking_link'), ...fb.cards], quickReplies: [] };
        stored = replaceFinalText(stored, fb.text);
      } else {
        reply = bookingFromChips({ text: final.text, cards: final.cards, quickReplies: dropButtonChips(final.quickReplies, final.cards) }, ctx);
        for (const id of check.promotionsMentioned) session.promotionsMentioned.add(id);
      }

      // Keyword safety net (D14): show help numbers even if the model didn't.
      const net = detectSafetyNet(clean, this.catalog.bundle.urgent.emergency_symptoms);
      if (net && !final.urgent) {
        reply.cards.unshift(urgentCard(net, this.catalog, lang));
        session.outcomes.add('urgent_redirect');
        log('safety_net', { session: session.hash.slice(0, 8), kind: net });
      }
    } catch (err) {
      // Any model or network failure ends at the booking link and phone (D23).
      log('turn_error', { session: session.hash.slice(0, 8), error: (err as Error)?.name ?? 'Error' });
      // Local development only: Bedrock validation messages describe request structure, not content.
      if (process.env.CONCIERGE_DEBUG === '1') console.error('[debug]', (err as Error)?.message); // log-guard: allow (local debug only; the Lambda handler never sets CONCIERGE_DEBUG)
      reply = this.fallback(lang);
      const net = detectSafetyNet(clean, this.catalog.bundle.urgent.emergency_symptoms);
      if (net) reply.cards.unshift(urgentCard(net, this.catalog, lang));
      stored = [...turnMessages, { role: 'assistant', content: [{ text: reply.text }] }];
    }

    session.modelMessages = normalizeHistory(stored);
    expireSupersededCards(session, reply.cards);
    reply.replyId = newReplyId();
    session.display.push({ role: 'guest', text: clean });
    session.display.push({ role: 'assistant', ...reply });
    return { reply };
  }

  private async runTurn(system: SystemContentBlock[], input: Message[], ctx: ToolContext): Promise<TurnResult> {
    const c = this.catalog.config;
    const added: Message[] = [];
    const texts: string[] = [];
    const cards: Card[] = [];
    let quickReplies: string[] = [];
    let urgent = false;

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const started = Date.now();
      const resp = await this.deps.model.converse({
        modelId: c.model.id,
        system,
        messages: [...input, ...added],
        toolConfig: { tools: ctx.session.audience === 'staff' ? STAFF_TOOLS : LINK_HANDOFF_TOOLS },
        // Claude 5.5 models don't accept temperature; sampling is left at the model default.
        inferenceConfig: { maxTokens: c.model.max_output_tokens },
        additionalModelRequestFields: (c.model.thinking === 'off'
          ? { thinking: { type: 'disabled' }, output_config: { effort: c.model.effort } }
          : { output_config: { effort: c.model.effort } }) as never,
      });
      log('model_call', {
        session: ctx.session.hash.slice(0, 8),
        model: c.model.id,
        ms: Date.now() - started,
        tokensIn: resp.usage?.inputTokens,
        tokensOut: resp.usage?.outputTokens,
        cacheRead: resp.usage?.cacheReadInputTokens,
        cacheWrite: resp.usage?.cacheWriteInputTokens,
        rounds: round,
        status: resp.stopReason,
      });
      ctx.session.tokens.in += resp.usage?.inputTokens ?? 0;
      ctx.session.tokens.out += resp.usage?.outputTokens ?? 0;
      const msg = resp.output?.message;
      if (!msg) throw new Error('EmptyModelResponse');
      added.push(msg);
      for (const block of msg.content ?? []) if (block.text) texts.push(block.text.trim());
      if (resp.stopReason !== 'tool_use') {
        // A reply cut off by the token limit can't be trusted: tool calls in it may be half-written
        // and never ran. Drop them (so history stays valid) and let the caller fall back.
        const cutOff = resp.stopReason !== 'end_turn' && resp.stopReason !== 'stop_sequence';
        if (cutOff) msg.content = (msg.content ?? []).filter((b) => !b.toolUse);
        const empty = !(msg.content ?? []).some((b) => b.text?.trim() || b.toolUse);
        if (empty) added.pop();
        return { added, text: joinReplies(texts), cards, quickReplies, urgent, completed: !cutOff, endsWithAssistant: !empty };
      }

      const results: ContentBlock[] = [];
      let displayOnly = true;
      for (const block of msg.content ?? []) {
        const use = block.toolUse;
        if (!use?.toolUseId || !use.name) continue;
        const outcome = round === MAX_TOOL_ROUNDS
          ? { result: { error: 'Tool limit reached for this message. Reply to the guest now without tools.' }, isError: true }
          : safeHandle(use.name, use.input, ctx);
        log('tool_call', { session: ctx.session.hash.slice(0, 8), tool: use.name, status: outcome.isError ? 'error' : 'ok' });
        if (outcome.cards) cards.push(...outcome.cards);
        if (outcome.quickReplies?.length) quickReplies = outcome.quickReplies;
        if (outcome.urgent) urgent = true;
        if (outcome.isError || !DISPLAY_ONLY.has(use.name)) displayOnly = false;
        results.push({
          toolResult: { toolUseId: use.toolUseId, content: [{ json: outcome.result as never }], status: outcome.isError ? 'error' : 'success' },
        });
      }
      added.push({ role: 'user', content: results });
      // The reply is written and the tools only showed things: stop, if the text passes its checks.
      // History ends on the tool results; the guest's next message joins that message.
      const written = joinReplies(texts);
      if (displayOnly && written.length >= 40 && this.check(written, ctx.today, ctx).ok) {
        return { added, text: written, cards, quickReplies, urgent, completed: true, endsWithAssistant: false };
      }
    }
    // Still asking for tools after the limit: close the history with a placeholder and let the caller fall back.
    added.push({ role: 'assistant', content: [{ text: '...' }] });
    return { added, text: '', cards, quickReplies, urgent, completed: false, endsWithAssistant: true };
  }

  async confirm(session: Session, actionId: string): Promise<ConfirmResponse> {
    const S = strings(session.lang);
    const action = session.pendingActions.get(actionId);
    const limits = this.catalog.config.booking.limits;
    const time = pick(this.catalog.config.handoff.callback_response_time, session.lang);
    const expired = (): ConfirmResponse => {
      if (action && action.status === 'pending') action.status = 'expired';
      setCardStatus(session, actionId, 'expired');
      return { actionId, status: 'expired', reply: { text: S.actionExpired, cards: [], quickReplies: [] } };
    };
    if (!action || action.status !== 'pending' || Date.now() - action.createdAt > ACTION_TTL_MS) return expired();
    if (action.kind === 'appointment' && session.counts.requests >= limits.max_bookings_per_session) return expired();
    if (action.kind === 'callback' && session.counts.callbacks >= limits.max_callbacks_per_session) return expired();

    const email = action.kind === 'appointment' ? appointmentEmail(this.catalog, action.payload) : callbackEmail(this.catalog, action.payload);
    await this.deps.outbox.send(email);
    action.status = 'confirmed';
    setCardStatus(session, actionId, 'confirmed');
    if (action.kind === 'appointment') {
      session.counts.requests += 1;
      session.outcomes.add('request');
      session.events.push('The guest tapped Confirm on the appointment request. It was sent to the team, who will contact the guest to confirm a time.');
    } else {
      session.counts.callbacks += 1;
      session.outcomes.add('handoff');
      session.events.push('The guest tapped Confirm on the callback request. It was sent to the team.');
    }
    log('action_confirmed', { session: session.hash.slice(0, 8), kind: action.kind });
    // After an appointment request, show what to know before the visit.
    const fv = action.kind === 'appointment' ? firstVisitCard(this.catalog, session.lang) : undefined;
    const reply: Reply = {
      replyId: newReplyId(),
      text: action.kind === 'appointment' ? `${S.appointmentSent(time)}${fv ? ` ${S.firstVisitIntro}` : ''}` : S.callbackSent(time),
      cards: fv ? [fv] : [],
      quickReplies: [],
    };
    session.display.push({ role: 'assistant', ...reply });
    return { actionId, status: 'confirmed', reply };
  }
}

const newReplyId = () => randomUUID().replace(/-/g, '').slice(0, 16);

// The reply must match what's on screen: telling the guest to tap Confirm when no confirmation
// card was produced (for example, the request tool rejected its input) is blocked and retried.
const ASKS_TO_CONFIRM = /\b(tap|click|press|hit|toca|pulsa|presiona|haz clic en)\b[^.!?\n]{0,30}\bconfirm/i;

function withConsistency(check: ReturnType<typeof checkText>, turn: Pick<TurnResult, 'cards' | 'text'>): ReturnType<typeof checkText> {
  if (ASKS_TO_CONFIRM.test(turn.text) && !turn.cards.some((c) => c.type === 'confirm' && c.status === 'pending')) {
    const problems = [...check.problems, 'it asks the guest to tap Confirm, but no confirmation card is shown; the request tool did not succeed, so fix the request or ask for what is missing'];
    return { ...check, ok: false, problems };
  }
  return check;
}

function safeHandle(name: string, input: unknown, ctx: ToolContext) {
  try {
    return handleTool(name, input, ctx);
  } catch (err) {
    log('tool_error', { tool: name, error: (err as Error)?.name ?? 'Error' });
    return { result: { error: 'That tool failed. Continue without it.' }, isError: true };
  }
}

// History kept between turns. Thinking blocks are dropped: they're bound to the exact system
// prompt they were created under, which changes every turn (the current-time block), and they're
// only needed within a single tool loop. That also keeps the model's reasoning out of storage.
// Dropping them can't leave an empty message or two user messages in a row.
export function normalizeHistory(messages: Message[]): Message[] {
  const out: Message[] = [];
  for (const m of messages) {
    const content = (m.content ?? []).filter((b) => !b.reasoningContent);
    if (content.length === 0) continue;
    const prev = out[out.length - 1];
    if (prev && prev.role === m.role) out[out.length - 1] = { role: m.role, content: [...(prev.content ?? []), ...content] };
    else out.push({ role: m.role, content });
  }
  return out;
}

// Chips that repeat a button on a card in the same reply only add noise, and the model can't save
// images itself (D59, D63), so those are dropped.
const SAVE_CARDS = new Set<Card['type']>(['treatment_options', 'event_plan', 'estimate', 'care_guide', 'membership']);
export function dropButtonChips(chips: string[], cards: Card[]): string[] {
  const types = new Set(cards.map((c) => c.type));
  const saveButton = cards.some((c) => SAVE_CARDS.has(c.type));
  return chips.filter(
    (chip) =>
      !(saveButton && /\b(save|guardar)\b/i.test(chip)) &&
      !(types.has('event_plan') && /\b(request|solicitar)\b.*\bplan\b/i.test(chip)) &&
      !(types.has('confirm') && /\b(confirm|confirmar)\b/i.test(chip)),
  );
}

// Booking belongs on a card, not a chip. When the model offers a "Book…" chip without a booking
// card and the treatment is clear (named in the chip, the one service card shown, or the
// consultation an options card leads to), the chip becomes the booking card (Nov 10 sales review).
const BOOK_CHIP = /\b(book|schedule|reserve|reservar|agendar)\b/i;
export function bookingFromChips(reply: Reply, ctx: ToolContext): Reply {
  const closed = reply.cards.some((c) => c.type === 'booking_link' || c.type === 'confirm' || c.type === 'urgent');
  const chips = reply.quickReplies.filter((q) => BOOK_CHIP.test(q));
  if (closed || !chips.length) return reply;
  const { catalog } = ctx;
  const services = [...catalog.services.values()];
  const byName = (q: string) => services.filter((s) => q.toLowerCase().includes(s.name.toLowerCase()));
  let target = chips.map(byName).find((m) => m.length === 1)?.[0];
  if (!target) {
    const shown = reply.cards.flatMap((c) => (c.type === 'service' ? [c.service.id] : c.type === 'treatment_options' ? c.items.map((i) => i.service.id) : []));
    const single = reply.cards.filter((c) => c.type === 'service');
    if (single.length === 1 && single[0]!.type === 'service') target = catalog.services.get(single[0]!.service.id);
    else if (shown.length) {
      // An options card: book its consultation when every option leads to the same one (or one is it).
      const consults = new Set(shown.map((id) => (catalog.services.get(id)?.details.requires_assessment ? catalog.consultFor(id)?.id : /consult/i.test(catalog.services.get(id)?.name ?? '') ? id : undefined)));
      const [only] = [...consults];
      if (consults.size === 1 && only) target = catalog.services.get(only);
    }
  }
  if (!target) return reply;
  const out = safeHandle('get_booking_link', { service_id: target.id }, ctx);
  if (out.isError || !out.cards?.length) return reply;
  const card = out.cards[0]!;
  ctx.session.events.push(`A booking button for ${card.type === 'booking_link' && card.serviceName ? card.serviceName : target.name} was shown under your last reply.`);
  return { ...reply, cards: [...reply.cards, ...out.cards], quickReplies: reply.quickReplies.filter((q) => !BOOK_CHIP.test(q)) };
}

// Adds check feedback to the last user message for a retry; the stored history never keeps it.
function withFeedback(messages: Message[], problems: string[]): Message[] {
  const out = messages.slice();
  const last = out[out.length - 1];
  const note: ContentBlock = {
    text: `<concierge_check>Your draft reply was blocked because ${problems.join('; ')}. Write the reply again without those problems, using only facts from your instructions. Don't mention this check.</concierge_check>`,
  };
  if (last && last.role === 'user') out[out.length - 1] = { role: 'user', content: [...(last.content ?? []), note] };
  return out;
}

// Replaces the text of the final assistant message so stored history matches what the guest saw.
function replaceFinalText(messages: Message[], text: string): Message[] {
  const out = messages.slice();
  const last = out[out.length - 1];
  if (last?.role === 'assistant') out[out.length - 1] = { role: 'assistant', content: [{ text }] };
  else out.push({ role: 'assistant', content: [{ text }] });
  return out;
}

function setCardStatus(session: Session, actionId: string, status: 'confirmed' | 'expired'): void {
  for (const m of session.display) for (const c of m.cards ?? []) if (c.type === 'confirm' && c.actionId === actionId) c.status = status;
}

// A new confirmation card replaces any earlier unconfirmed one of the same kind.
function expireSupersededCards(session: Session, newCards: Card[]): void {
  const kinds = new Set(newCards.flatMap((c) => (c.type === 'confirm' ? [c.kind] : [])));
  if (!kinds.size) return;
  for (const m of session.display) {
    for (const c of m.cards ?? []) if (c.type === 'confirm' && kinds.has(c.kind) && c.status === 'pending') c.status = 'expired';
  }
}
