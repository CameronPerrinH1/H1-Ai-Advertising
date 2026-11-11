// Cards are built by the backend from catalog data (D59); this file only lays them out.
import type { Card, CountedItem, EstimateView, Lang, ProviderView, ServiceView } from '@concierge/shared';
import { dayDate, money, priceLabel, shortDate, type UiStrings } from '../i18n';
import {
  AlertIcon,
  BagIcon,
  CalendarIcon,
  ChartIcon,
  CheckIcon,
  ClockIcon,
  DownloadIcon,
  ExternalIcon,
  FormIcon,
  PhoneIcon,
  PinIcon,
  ReceiptIcon,
  SparkleIcon,
  StarIcon,
} from '../icons';

export interface CardHandlers {
  onSend: (text: string) => void;
  onConfirm: (actionId: string) => void;
  onChangeDetails: () => void;
  onSave: (card: Card) => void;
  busyActions: Set<string>;
  businessName: string;
}

function SaveButton({ card, s, h }: { card: Card; s: UiStrings; h: CardHandlers }) {
  return (
    // Plain icon and text, not a button shape, so it doesn't compete with the card's actions (Cameron, Nov 11).
    <button type="button" class="save-link" onClick={() => h.onSave(card)}>
      <DownloadIcon size={14} />
      {s.saveImage}
    </button>
  );
}

function EstimateTotal({ estimate, s }: { estimate: EstimateView; s: UiStrings }) {
  return (
    <div class="est-total">
      <div class="est-row">
        <span>{s.estimatedTotal}</span>
        <strong>
          {s.about} {money(estimate.total)}
          {estimate.totalIsFrom ? '+' : ''}
        </strong>
      </div>
      {estimate.perUnit.length > 0 && <p class="muted small">{s.pricedAtVisit(estimate.perUnit.join(', '))}</p>}
      <p class="est-note">{s.estimateNote}</p>
    </div>
  );
}

interface Props {
  card: Card;
  s: UiStrings;
  lang: Lang;
  h: CardHandlers;
}

const external = { target: '_blank', rel: 'noopener noreferrer' } as const;

function PriceLine({ service, s }: { service: ServiceView; s: UiStrings }) {
  if (!service.promo) return <>{priceLabel(service.price, s)}</>;
  return (
    <>
      <s class="was">{priceLabel(service.price, s)}</s> <strong class="now">{money(service.promo.price)}</strong>
    </>
  );
}

function Promo({ service, s, lang }: { service: ServiceView; s: UiStrings; lang: Lang }) {
  if (!service.promo) return null;
  return (
    <p class="promo">
      <SparkleIcon size={14} />
      <span>
        {service.promo.label}
        {service.promo.ends && ` · ${s.promoUntil(shortDate(service.promo.ends, lang))}`}
      </span>
    </p>
  );
}

// With booking in the chat (inChat), a card never books: its button asks Mila how the treatment
// would help with the guest's concern, so she explains it before any booking (Cameron, Nov 11).
// Otherwise it opens the booking page.
function BookButton({ service, s, variant = 'primary', inChat, onSend }: { service: ServiceView; s: UiStrings; variant?: 'primary' | 'ghost'; inChat?: boolean; onSend?: (text: string) => void }) {
  const consult = service.action.kind === 'consult';
  const label = consult ? s.bookConsult : s.bookOnline;
  if (inChat && onSend) {
    return (
      <button type="button" class={`btn ${variant === 'primary' ? 'ghost' : variant}`} onClick={() => onSend(s.askHow(service.name))}>
        <SparkleIcon size={16} />
        {s.rightForMe}
      </button>
    );
  }
  return (
    <a class={`btn ${variant}`} href={service.action.url} {...external}>
      <CalendarIcon size={16} />
      {label}
    </a>
  );
}

function Thumb({ service }: { service: ServiceView }) {
  return service.image ? <img src={service.image} alt="" loading="lazy" /> : <span class="thumb-fallback" />;
}

function OptionsCard({ card, s, lang, h }: Props & { card: Extract<Card, { type: 'treatment_options' }> }) {
  return (
    <section class="card options" aria-label={s.yourOptions}>
      <header class="card-head">
        <span class="head-icon">
          <SparkleIcon size={16} />
        </span>
        <div>
          <p class="eyebrow">{s.yourOptions}</p>
          {card.headline && <h3>{card.headline}</h3>}
        </div>
      </header>
      <ol class="option-list">
        {card.items.map(({ service, reason }, i) => (
          <li class={`option${service.image ? '' : ' no-thumb'}`} style={{ '--i': i }} key={service.id}>
            {service.image && (
              <div class="option-thumb">
                <Thumb service={service} />
              </div>
            )}
            <div class="option-body">
              <h4>{service.name}</h4>
              <p class="reason">{reason}</p>
              <div class="meta">
                <span class="price">
                  <PriceLine service={service} s={s} />
                </span>
                {service.downtime && (
                  <span class="pill">
                    <ClockIcon size={13} />
                    {s.downtime}: {service.downtime}
                  </span>
                )}
                {service.requiresAssessment && <span class="pill soft">{s.needsConsult}</span>}
              </div>
              <Promo service={service} s={s} lang={lang} />
              <div class="actions">
                <BookButton service={service} s={s} inChat={card.bookInChat} onSend={h.onSend} />
                {!card.bookInChat && (
                  <button type="button" class="btn ghost" onClick={() => h.onSend(s.requestService(service.name))}>
                    {s.requestThis}
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>
      <div class="card-foot">
        <p class="fineprint">{s.optionsNote}</p>
        <SaveButton card={card} s={s} h={h} />
      </div>
    </section>
  );
}

function EventPlanCard({ card, s, lang, h }: Props & { card: Extract<Card, { type: 'event_plan' }> }) {
  return (
    <section class="card plan" aria-label={s.countdownTo(card.label)}>
      <header class="card-head">
        <span class="head-icon">
          <CalendarIcon size={16} />
        </span>
        <div>
          <p class="eyebrow">{s.countdown}</p>
          <h3>{s.countdownTo(card.label)}</h3>
          <p class="muted small">
            {dayDate(card.eventDate, lang)} · {s.daysToGo(card.daysToGo)}
          </p>
        </div>
      </header>
      <ol class="timeline">
        {card.items.map((i, idx) => (
          <li class="tl-item" style={{ '--i': idx }} key={i.service.id}>
            <span class="tl-dot" aria-hidden="true" />
            <div class="tl-date">
              <strong>{dayDate(i.date, lang)}</strong>
              <span>{s.daysBefore(i.daysBefore)}</span>
            </div>
            <div class="tl-body">
              <h4>{i.service.name}</h4>
              {i.service.downtime && (
                <p class="muted small">
                  {s.downtime}: {i.service.downtime}
                </p>
              )}
              <div class="meta">
                <span class="price">
                  <PriceLine service={i.service} s={s} />
                </span>
                {i.service.requiresAssessment && <span class="pill soft">{s.needsConsult}</span>}
                {i.tight && <span class="pill warn">{s.tighter}</span>}
              </div>
            </div>
          </li>
        ))}
        <li class="tl-item final" style={{ '--i': card.items.length }}>
          <span class="tl-dot star" aria-hidden="true">
            <StarIcon size={11} />
          </span>
          <div class="tl-date">
            <strong>{dayDate(card.eventDate, lang)}</strong>
          </div>
          <div class="tl-body">
            <h4>{s.theDay}</h4>
          </div>
        </li>
      </ol>
      {card.skipped.length > 0 && <p class="note mx">{s.tooClose(card.skipped.map((x) => x.service.name).join(', '))}</p>}
      <EstimateTotal estimate={card.estimate} s={s} />
      <div class="actions pad-actions">
        {card.items.length > 0 && (
          <button type="button" class="btn primary" onClick={() => h.onSend(s.requestPlanText)}>
            {s.requestPlan}
          </button>
        )}
        <SaveButton card={card} s={s} h={h} />
      </div>
    </section>
  );
}

function EstimateCard({ card, s, h }: Props & { card: Extract<Card, { type: 'estimate' }> }) {
  return (
    <section class="card estimate" aria-label={s.estimate}>
      <header class="card-head">
        <span class="head-icon">
          <ReceiptIcon size={16} />
        </span>
        <p class="eyebrow">{s.estimate}</p>
      </header>
      <ul class="lines">
        {card.estimate.lines.map((l) => (
          <li key={l.name}>
            <span>
              {l.name}
              {l.addOn && <span class="muted"> · {s.addOn}</span>}
            </span>
            <span class={l.counted ? '' : 'muted'}>
              {l.promoPrice !== undefined ? (
                <>
                  <s class="was">{priceLabel(l.price, s)}</s> <strong class="now">{money(l.promoPrice)}</strong>
                </>
              ) : (
                priceLabel(l.price, s)
              )}
            </span>
          </li>
        ))}
      </ul>
      <EstimateTotal estimate={card.estimate} s={s} />
      <div class="actions pad-actions">
        <SaveButton card={card} s={s} h={h} />
      </div>
    </section>
  );
}

function CareGuideCard({ card, s, h }: Props & { card: Extract<Card, { type: 'care_guide' }> }) {
  const sections: ['before' | 'dayOf' | 'after', string, string[]][] = [
    ['before', s.before, card.before],
    ['dayOf', s.dayOf, card.dayOf],
    ['after', s.after, card.after],
  ];
  return (
    <section class="card care" aria-label={`${s.careGuide}: ${card.service.name}`}>
      <header class="card-head">
        <span class="head-icon">
          <SparkleIcon size={16} />
        </span>
        <div>
          <p class="eyebrow">{s.careGuide}</p>
          <h3>{card.service.name}</h3>
        </div>
      </header>
      <div class="care-cols">
        {sections
          .filter(([, , list]) => list.length > 0)
          .map(([key, label, list]) => (
            <div class={`care-col ${card.focus === key ? 'focus' : ''}`} key={key}>
              <h4>{label}</h4>
              <ul>
                {list.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          ))}
      </div>
      <div class="card-foot">
        <p class="fineprint">{s.careNote(h.businessName)}</p>
        <SaveButton card={card} s={s} h={h} />
      </div>
    </section>
  );
}

function MembershipCard({ card, s, h }: Props & { card: Extract<Card, { type: 'membership' }> }) {
  const max = Math.max(card.payAsYouGo, card.member, 1);
  return (
    <section class="card membership" aria-label={card.name}>
      <header class="card-head">
        <span class="head-icon">
          <StarIcon size={15} />
        </span>
        <div>
          <p class="eyebrow">{s.membership}</p>
          <h3>{card.name}</h3>
        </div>
        <span class="price-tag">
          {money(card.monthlyPrice)} <small>{s.perMonth}</small>
        </span>
      </header>
      <ul class="perks">
        <li>
          <CheckIcon size={15} />
          {s.includes(card.perMonth, card.includedService)}
        </li>
        {card.discountPercent ? (
          <li>
            <CheckIcon size={15} />
            {s.memberDiscount(card.discountPercent)}
          </li>
        ) : null}
      </ul>
      <div class="bars">
        <div class="bar-row">
          <span>{s.payPerVisit}</span>
          <div class="bar">
            <i style={{ width: `${(card.payAsYouGo / max) * 100}%` }} />
          </div>
          <strong>
            {money(card.payAsYouGo)}
            <small> {s.perYear}</small>
          </strong>
        </div>
        <div class="bar-row member">
          <span>{s.asMember}</span>
          <div class="bar">
            <i style={{ width: `${(card.member / max) * 100}%` }} />
          </div>
          <strong>
            {money(card.member)}
            <small> {s.perYear}</small>
          </strong>
        </div>
      </div>
      <p class={`savings ${card.savings > 0 ? 'good' : ''}`}>
        {card.savings > 0 ? s.savings(money(card.savings), card.visitsPerYear) : s.noSavings(card.visitsPerYear)}
      </p>
      {card.terms && <p class="fineprint">{card.terms}</p>}
      <div class="actions pad-actions">
        <button type="button" class="btn primary" onClick={() => h.onSend(s.howToJoinText(card.name))}>
          {s.howToJoin}
        </button>
        <SaveButton card={card} s={s} h={h} />
      </div>
    </section>
  );
}

function FirstVisitCard({ card, s }: Props & { card: Extract<Card, { type: 'first_visit' }> }) {
  return (
    <section class="card first-visit" aria-label={s.firstVisit}>
      <header class="card-head">
        <span class="head-icon">
          <ClockIcon size={16} />
        </span>
        <div>
          <p class="eyebrow">{s.firstVisit}</p>
          <h3>{s.arrive(card.arriveMinutes)}</h3>
        </div>
      </header>
      <dl class="fv">
        {card.parking && (
          <div>
            <dt>
              <PinIcon size={15} />
              {s.parking}
            </dt>
            <dd>{card.parking}</dd>
          </div>
        )}
        {card.bring.length > 0 && (
          <div>
            <dt>
              <BagIcon size={15} />
              {s.bring}
            </dt>
            <dd>
              <ul>
                {card.bring.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </dd>
          </div>
        )}
        {card.notes.length > 0 && (
          <div>
            <dt>
              <SparkleIcon size={15} />
              {s.goodToKnow}
            </dt>
            <dd>
              <ul>
                {card.notes.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </dd>
          </div>
        )}
      </dl>
      {card.formUrl && (
        <div class="actions pad-actions">
          <a class="btn primary" href={card.formUrl} {...external}>
            <FormIcon size={16} />
            {s.newGuestForm}
          </a>
        </div>
      )}
    </section>
  );
}

function CountList({ title, items, s }: { title: string; items: CountedItem[]; s: UiStrings }) {
  return (
    <div class="ins-sec">
      <h4>{title}</h4>
      {items.length ? (
        <ol>
          {items.map((i) => (
            <li key={i.text}>
              <span>{i.text}</span>
              <span class="count">{i.count}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p class="muted small">{s.nothingYet}</p>
      )}
    </div>
  );
}

function InsightsCard({ card, s }: Props & { card: Extract<Card, { type: 'insights' }> }) {
  return (
    <section class="card insights" aria-label={s.insights}>
      <header class="card-head">
        <span class="head-icon">
          <ChartIcon size={16} />
        </span>
        <div>
          <p class="eyebrow">{s.insights}</p>
          <h3>{card.period}</h3>
          <p class="muted small">{s.conversations(card.conversations)}</p>
        </div>
      </header>
      <div class="ins-stats">
        <div>
          <span class="stat">
            {card.quality.avgMinutes ?? '–'}
            <small> {s.minutesShort}</small>
          </span>
          <span class="muted small">{s.avgChat}</span>
        </div>
        <div>
          <span class="stat">
            {card.quality.avgScore ?? '–'}
            <small>/5</small>
          </span>
          <span class="muted small">{s.answerQuality}</span>
        </div>
        <div>
          <span class="stat">{card.quality.flagged}</span>
          <span class="muted small">{s.flaggedForReview}</span>
        </div>
      </div>
      <CountList title={s.unanswered} items={card.unanswered} s={s} />
      <CountList title={s.notOffered} items={card.notOffered} s={s} />
      <CountList title={s.topTopics} items={card.topics} s={s} />
      {card.quality.scores.length > 0 && (
        <CountList title={s.qualityBreakdown} items={card.quality.scores.map((x) => ({ text: x.text, count: x.avg }))} s={s} />
      )}
      {card.quality.flagReasons.length > 0 && <CountList title={s.whyFlagged} items={card.quality.flagReasons} s={s} />}
      <p class="fineprint">{s.insightsNote}</p>
    </section>
  );
}

function ServiceCard({ card, s, lang, h }: Props & { card: Extract<Card, { type: 'service' }> }) {
  const sv = card.service;
  return (
    <section class="card service" aria-label={sv.name}>
      {sv.image && (
        <div class="hero">
          <img src={sv.image} alt="" loading="lazy" />
        </div>
      )}
      <div class="pad">
        <h3>{sv.name}</h3>
        <p class="summary">{sv.summary}</p>
        <dl class="facts">
          <div>
            <dt>{s.price}</dt>
            <dd>
              <PriceLine service={sv} s={s} />
            </dd>
          </div>
          {sv.durationMinutes && (
            <div>
              <dt>{s.duration}</dt>
              <dd>
                {sv.durationMinutes} {s.min}
              </dd>
            </div>
          )}
          {sv.downtime && (
            <div>
              <dt>{s.downtime}</dt>
              <dd>{sv.downtime}</dd>
            </div>
          )}
          {sv.results && (
            <div>
              <dt>{s.results}</dt>
              <dd>{sv.results}</dd>
            </div>
          )}
        </dl>
        <Promo service={sv} s={s} lang={lang} />
        {sv.requiresAssessment && (
          <p class="note">
            {s.needsConsult}
            {sv.action.consultName ? `: ${sv.action.consultName}` : ''}
          </p>
        )}
        <div class="actions">
          <BookButton service={sv} s={s} inChat={card.bookInChat} onSend={h.onSend} />
          {!card.bookInChat && (
            <button type="button" class="btn ghost" onClick={() => h.onSend(s.requestService(sv.name))}>
              {s.requestThis}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function CompareCard({ card, s, h }: Props & { card: Extract<Card, { type: 'compare' }> }) {
  // Each row: its label, how a cell reads, and whether a service has a value for it. A row no
  // compared service has a value for is left out, never shown as a line of dashes.
  const all: [string, (sv: ServiceView) => preact.ComponentChildren, (sv: ServiceView) => boolean][] = [
    [s.price, (sv) => <PriceLine service={sv} s={s} />, () => true],
    [s.duration, (sv) => (sv.durationMinutes ? `${sv.durationMinutes} ${s.min}` : '–'), (sv) => !!sv.durationMinutes],
    [s.downtime, (sv) => sv.downtime ?? '–', (sv) => !!sv.downtime],
    [s.results, (sv) => sv.results ?? '–', (sv) => !!sv.results],
    [s.consult, (sv) => (sv.requiresAssessment ? s.yes : s.no), () => true],
  ];
  const rows = all.filter(([, , has]) => card.services.some(has)).map(([label, value]) => [label, value] as const);
  return (
    <section class="card compare" aria-label={s.sideBySide}>
      <p class="eyebrow pad-x">{s.sideBySide}</p>
      <div class="compare-grid" style={{ '--cols': card.services.length }} role="table">
        <div class="crow head" role="row">
          <div class="label" role="columnheader" />
          {card.services.map((sv) => (
            <div class="col-head" role="columnheader" key={sv.id}>
              {sv.image && <img src={sv.image} alt="" loading="lazy" />}
              <strong>{sv.name}</strong>
            </div>
          ))}
        </div>
        {rows.map(([label, value]) => (
          <div class="crow" role="row" key={label}>
            <div class="label" role="rowheader">
              {label}
            </div>
            {card.services.map((sv) => (
              <div role="cell" key={sv.id}>
                {value(sv)}
              </div>
            ))}
          </div>
        ))}
        <div class="crow actions-row" role="row">
          <div class="label" role="cell" />
          {card.services.map((sv) => (
            <div role="cell" key={sv.id}>
              <BookButton service={sv} s={s} variant="ghost" inChat={card.bookInChat} onSend={h.onSend} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProviderCard({ card, s, h }: Props & { card: Extract<Card, { type: 'provider' }> }) {
  const p: ProviderView = card.provider;
  const first = p.name.split(/\s+/)[0] ?? p.name;
  return (
    <section class="card provider pad" aria-label={p.name}>
      <div class="prov-head">
        <div class="avatar lg" aria-hidden="true">
          {p.initials}
        </div>
        <div>
          <h3>
            {p.name}
            {p.credentials && <span class="cred">, {p.credentials}</span>}
          </h3>
          <p class="muted">{p.title}</p>
        </div>
      </div>
      <p class="bio">{p.bio}</p>
      <div class="pills">
        {p.specialties.map((x) => (
          <span class="pill soft" key={x}>
            {x}
          </span>
        ))}
      </div>
      <p class="muted small">
        {s.speaks}: {p.languages.map((l) => s.langNames[l]).join(', ')}
      </p>
      <div class="actions">
        <button type="button" class="btn primary" onClick={() => h.onSend(s.requestWithText(p.name))}>
          {s.requestWith(first)}
        </button>
      </div>
    </section>
  );
}

function LinkCard({ card, s }: Props & { card: Extract<Card, { type: 'booking_link' }> }) {
  const label =
    card.purpose === 'manage'
      ? s.manage
      : card.purpose === 'rsvp'
        ? s.rsvpFor(card.eventName ?? '')
      : card.consult && card.serviceName
        ? s.bookConsultFor(card.serviceName)
        : card.serviceName
          ? s.bookService(card.serviceName)
          : s.bookGeneric;
  return (
    <a class="card link-card" href={card.url} {...external}>
      <span class="link-icon">
        <CalendarIcon size={18} />
      </span>
      <span class="link-text">
        <strong>{label}</strong>
        <span class="muted small">{s.opensBooking}</span>
      </span>
      <ExternalIcon size={16} />
    </a>
  );
}

// Live openings: each time opens the booking page, where the guest confirms it.
function OpeningsCard({ card, s, h }: Props & { card: Extract<Card, { type: 'openings' }> }) {
  const meta = s.openingsWith(card.providerName, card.durationMinutes);
  return (
    <section class="card openings" aria-label={`${s.openingsEyebrow}: ${card.serviceName}`}>
      <header class="card-head">
        <span class="head-icon">
          <CalendarIcon size={16} />
        </span>
        <div>
          <p class="eyebrow">{s.openingsEyebrow}</p>
          <h3>{card.serviceName}</h3>
          {meta && <p class="muted small">{meta}</p>}
        </div>
      </header>
      <div class="pad openings-body">
        {card.days.map((d) => (
          <div class="openings-day" key={d.date}>
            <span class="openings-date">{d.label}</span>
            <div class="openings-times">
              {d.times.map((t) =>
                card.selectable ? (
                  // With holds on, a time is picked in the chat, then held once the guest confirms.
                  <button type="button" class="time-chip" key={t.time} onClick={() => h.onSend(s.pickTime(d.label, t.label))}>
                    {t.label}
                  </button>
                ) : (
                  <a class="time-chip" key={t.time} href={card.url} {...external} aria-label={`${d.label}, ${t.label}. ${s.opensBooking}`}>
                    {t.label}
                  </a>
                ),
              )}
            </div>
          </div>
        ))}
        <p class="muted small openings-note">{card.selectable ? s.openingsPickNote : s.openingsNote}</p>
        {/* With in-chat booking there's no link to the booking page at all (Cameron, Nov 11). */}
        {!card.selectable && (
          <a class="btn ghost openings-all" href={card.url} {...external}>
            <CalendarIcon size={16} />
            {s.seeAllTimes}
          </a>
        )}
      </div>
    </section>
  );
}

function ConfirmCard({ card, s, h }: Props & { card: Extract<Card, { type: 'confirm' }> }) {
  const title = card.kind === 'appointment' ? s.appointmentRequest : s.callbackRequest;
  const busy = h.busyActions.has(card.actionId);
  return (
    <section class={`card confirm ${card.status}`} aria-label={title}>
      <header class="card-head">
        <span class="head-icon">{card.kind === 'appointment' ? <CalendarIcon size={16} /> : <PhoneIcon size={16} />}</span>
        <h3>{title}</h3>
        {card.status === 'confirmed' && (
          <span class="status ok">
            <CheckIcon size={14} />
            {s.sent}
          </span>
        )}
        {card.status === 'expired' && <span class="status off">{s.expired}</span>}
      </header>
      <dl class="fields">
        {card.fields.map((f) => (
          <div key={f.key}>
            <dt>{s.fields[f.key]}</dt>
            <dd>{f.value}</dd>
          </div>
        ))}
      </dl>
      <p class="note">{card.note}</p>
      {card.status === 'pending' && (
        <div class="actions">
          {/* In preview, the whole booking flow runs but Confirm is greyed out (nothing is held or sent). */}
          <button
            type="button"
            class="btn primary"
            disabled={busy || card.preview}
            aria-disabled={card.preview ? 'true' : undefined}
            title={card.preview ? card.note : undefined}
            onClick={() => !card.preview && h.onConfirm(card.actionId)}
          >
            {busy ? s.sending : s.confirm}
          </button>
          <button type="button" class="btn ghost" disabled={busy} onClick={h.onChangeDetails}>
            {s.changeDetails}
          </button>
        </div>
      )}
    </section>
  );
}

function UrgentCard({ card }: Props & { card: Extract<Card, { type: 'urgent' }> }) {
  return (
    <section class={`card urgent ${card.kind}`} role="alert">
      <header class="card-head">
        <span class="head-icon">
          <AlertIcon size={16} />
        </span>
        <h3>{card.title}</h3>
      </header>
      <p>{card.body}</p>
      <div class="actions">
        {card.actions.map((a, i) => (
          <a class={`btn ${i === 0 ? 'danger' : 'ghost'}`} href={a.href} key={a.href}>
            <PhoneIcon size={16} />
            {a.label}
          </a>
        ))}
      </div>
    </section>
  );
}

export function CardView(props: Props) {
  const { card } = props;
  switch (card.type) {
    case 'treatment_options':
      return <OptionsCard {...props} card={card} />;
    case 'service':
      return <ServiceCard {...props} card={card} />;
    case 'compare':
      return <CompareCard {...props} card={card} />;
    case 'provider':
      return <ProviderCard {...props} card={card} />;
    case 'booking_link':
      return <LinkCard {...props} card={card} />;
    case 'openings':
      return <OpeningsCard {...props} card={card} />;
    case 'confirm':
      return <ConfirmCard {...props} card={card} />;
    case 'urgent':
      return <UrgentCard {...props} card={card} />;
    case 'event_plan':
      return <EventPlanCard {...props} card={card} />;
    case 'estimate':
      return <EstimateCard {...props} card={card} />;
    case 'care_guide':
      return <CareGuideCard {...props} card={card} />;
    case 'membership':
      return <MembershipCard {...props} card={card} />;
    case 'first_visit':
      return <FirstVisitCard {...props} card={card} />;
    case 'insights':
      return <InsightsCard {...props} card={card} />;
  }
}
