import { useEffect, useRef } from 'preact/hooks';
import type { Ref } from 'preact';
import type { Lang, PublicConfig } from '@concierge/shared';
import { shortDate, type UiStrings } from '../i18n';
import { openStatus } from '../hours';
import { CalendarIcon, ChatIcon, CloseIcon, EndIcon, ExpandIcon, PhoneIcon, SendIcon, SparkleIcon } from '../icons';
import { Face } from './Face';

interface HeaderProps {
  config: PublicConfig;
  s: UiStrings;
  lang: Lang;
  setLang: (l: Lang) => void;
  active: boolean;
  mode: 'inline' | 'fullscreen';
  onEnd: () => void;
  onExpand: () => void;
  onClose: () => void;
}

export function Header({ config, s, lang, setLang, active, mode, onEnd, onExpand, onClose }: HeaderProps) {
  return (
    <header class="top">
      <div class="identity">
        <div class="avatar" aria-hidden="true">
          <Face c={config.concierge} />
        </div>
        <div>
          <p class="name">
            {config.concierge.name}
            {config.demo && <span class="badge demo">{s.demo}</span>}
          </p>
          <p class="label">
            {config.concierge.disclosureLabel[lang]} · {config.businessName}
          </p>
        </div>
      </div>
      <div class="tools">
        {config.languages.length > 1 && (
          <div class="lang" role="group" aria-label={s.language}>
            {config.languages.map((l) => (
              <button type="button" key={l} lang={l} aria-pressed={l === lang} title={s.langNames[l]} onClick={() => setLang(l)}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        )}
        {active && (
          <button type="button" class="icon-btn with-label" onClick={onEnd} title={s.endChat}>
            <EndIcon size={17} />
            <span class="btn-label">{s.endChat}</span>
          </button>
        )}
        {mode === 'inline' && config.display.modes.includes('fullscreen') && (
          <button type="button" class="icon-btn" onClick={onExpand} aria-label={s.expand} title={s.expand}>
            <ExpandIcon size={17} />
          </button>
        )}
        {mode === 'fullscreen' && (
          <button type="button" class="icon-btn" onClick={onClose} aria-label={s.close} title={s.close}>
            <CloseIcon size={18} />
          </button>
        )}
      </div>
    </header>
  );
}

export function NoticeLine({ config, s, lang }: { config: PublicConfig; s: UiStrings; lang: Lang }) {
  return (
    <p class="notice-line">
      {config.notice.text[lang]}{' '}
      <a href={config.notice.privacyUrl} target="_blank" rel="noopener noreferrer">
        {s.privacy}
      </a>
    </p>
  );
}

interface WelcomeProps {
  config: PublicConfig;
  s: UiStrings;
  lang: Lang;
  suggestions: string[];
  starting: boolean;
  onStart: (firstMessage?: string) => void;
}

// The notice and the Start chat button come before anything is collected; tapping Start chat
// (or a suggested question right under the notice) is the visitor's consent (D35).
export function Welcome({ config, s, lang, suggestions, starting, onStart }: WelcomeProps) {
  const status = openStatus(config.hours, config.timezone, s, lang);
  return (
    <div class="welcome">
      <div class="avatar xl" aria-hidden="true">
        <Face c={config.concierge} />
      </div>
      <h1>{s.askAnything(config.concierge.name)}</h1>
      <p class="sub">{s.welcomeSub}</p>
      {status && (
        <p class={`status-pill ${status.open ? 'open' : 'closed'}`}>
          <span class="dot" aria-hidden="true" />
          {status.text}
        </p>
      )}
      <div class="notice-box">
        <p>
          {config.notice.text[lang]}{' '}
          <a href={config.notice.privacyUrl} target="_blank" rel="noopener noreferrer">
            {s.privacy}
          </a>
        </p>
      </div>
      {config.promotions.length > 0 && (
        <div class="promos">
          {config.promotions.map((p) => (
            <button type="button" class="promo-pill" key={p.id} disabled={starting} onClick={() => onStart(s.promoAsk(p.label))}>
              <SparkleIcon size={14} />
              {p.label}
              {p.ends && ` · ${s.promoUntil(shortDate(p.ends, lang))}`}
            </button>
          ))}
        </div>
      )}
      {suggestions.length > 0 && (
        <div class="suggest">
          {suggestions.map((q) => (
            <button type="button" class="chip" key={q} disabled={starting} onClick={() => onStart(q)}>
              {q}
            </button>
          ))}
        </div>
      )}
      <button type="button" class="btn primary lg" disabled={starting} onClick={() => onStart()}>
        <ChatIcon size={18} />
        {s.startChat}
      </button>
      <p class="hint">{s.startHint}</p>
    </div>
  );
}

interface ComposerProps {
  s: UiStrings;
  value: string;
  setValue: (v: string) => void;
  disabled: boolean;
  onSubmit: () => void;
  inputRef: Ref<HTMLTextAreaElement>;
  placeholder?: string;
}

export function Composer({ s, value, setValue, disabled, onSubmit, inputRef, placeholder = s.placeholder }: ComposerProps) {
  const local = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = local.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [value]);

  return (
    <form
      class="composer"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <label class="sr-only" for="concierge-input">
        {placeholder}
      </label>
      <textarea
        id="concierge-input"
        ref={(el) => {
          local.current = el;
          if (typeof inputRef === 'function') inputRef(el);
          else if (inputRef) inputRef.current = el;
        }}
        rows={1}
        maxLength={2000}
        placeholder={placeholder}
        value={value}
        onInput={(e) => setValue((e.target as HTMLTextAreaElement).value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
            e.preventDefault();
            onSubmit();
          }
        }}
      />
      <button type="submit" class="send" disabled={disabled || !value.trim()} aria-label={s.send}>
        <SendIcon size={18} />
      </button>
    </form>
  );
}

interface UnavailableProps {
  s: UiStrings;
  businessName: string;
  phone: string;
  bookingUrl: string;
  onClose?: () => void;
}

// Shown while the kill switch is on or the chat can't be reached (D43): the phone number and
// booking link, so no visitor is left without a way to book.
export function Unavailable({ s, businessName, phone, bookingUrl, onClose }: UnavailableProps) {
  return (
    <div class="welcome unavailable" role="status">
      {onClose && (
        <button type="button" class="icon-btn corner" onClick={onClose} aria-label={s.close} title={s.close}>
          <CloseIcon size={18} />
        </button>
      )}
      <span class="unavailable-icon" aria-hidden="true">
        <ChatIcon size={26} />
      </span>
      <h1>{s.unavailableTitle}</h1>
      <p class="sub">{s.unavailableBody(businessName)}</p>
      <div class="actions center">
        <a class="btn primary lg" href={bookingUrl} target="_blank" rel="noopener noreferrer">
          <CalendarIcon size={18} />
          {s.bookGeneric}
        </a>
        {phone && (
          <a class="btn ghost lg" href={`tel:${phone.replace(/[^\d+]/g, '')}`}>
            <PhoneIcon size={18} />
            {s.callUs} {phone}
          </a>
        )}
      </div>
    </div>
  );
}
