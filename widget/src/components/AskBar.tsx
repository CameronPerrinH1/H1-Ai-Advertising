// The ask bar (display mode "askbar"): a bar docked at the bottom of each page of the spa's site.
// Before a chat starts it shows the page's greeting, its suggested questions and the notice; sending
// a question or tapping one is the visitor's consent, as with Start chat (D35). Once a chat runs,
// the conversation opens in a card above the bar and can be minimized back to the bar.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Ref } from 'preact';
import type { Lang, PageCopy, PublicConfig } from '@concierge/shared';
import type { UiStrings } from '../i18n';
import { ArrowUpIcon, ChevronDownIcon, CloseIcon, EndIcon, ExpandIcon } from '../icons';
import { Face } from './Face';
import { useOneRow } from '../oneRow';

interface BarProps {
  config: PublicConfig;
  s: UiStrings;
  lang: Lang;
  value: string;
  setValue: (v: string) => void;
  disabled: boolean;
  placeholder: string;
  onSubmit: () => void;
  onFocus?: () => void;
  inputRef: Ref<HTMLTextAreaElement>;
}

// The dark pill: who the guest is talking to, the question box and send.
export function Bar({ config, s, lang, value, setValue, disabled, placeholder, onSubmit, onFocus, inputRef }: BarProps) {
  const local = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const el = local.current;
    if (!el) return;
    // Empty, it stays one line however long the hint is; it grows only with what's typed.
    el.style.height = 'auto';
    el.style.height = value ? `${Math.min(el.scrollHeight, 96)}px` : '';
  }, [value]);
  return (
    <form
      class="askbar-bar"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <span class="askbar-face" aria-hidden="true">
        <span class="avatar">
          <Face c={config.concierge} />
        </span>
        <span class="online" />
      </span>
      <label class="askbar-who" for="askbar-input">
        <span class="who-name">{s.nameFrom(config.concierge.name, config.businessName)}</span>
        <span class="who-label">{config.concierge.disclosureLabel[lang]}</span>
      </label>
      <textarea
        id="askbar-input"
        ref={(el) => {
          local.current = el;
          if (typeof inputRef === 'function') inputRef(el);
          else if (inputRef) inputRef.current = el;
        }}
        rows={1}
        maxLength={2000}
        placeholder={placeholder}
        aria-label={placeholder}
        value={value}
        onFocus={onFocus}
        onInput={(e) => setValue((e.target as HTMLTextAreaElement).value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
            e.preventDefault();
            onSubmit();
          }
        }}
      />
      <button type="submit" class="askbar-send" disabled={disabled || !value.trim()} aria-label={s.send}>
        <ArrowUpIcon size={18} />
      </button>
    </form>
  );
}

interface PhoneBarProps {
  config: PublicConfig;
  lang: Lang;
  hint: string;
  onOpen: () => void;
}

// On a phone the bar is a button that opens the chat full screen (Cameron, Nov 19: the card over
// the page was hard to read and the prompt was cut off). The AI label stays beside the face (D45),
// on its own line above the hint, so the hint gets the bar's full width.
export function PhoneBar({ config, lang, hint, onOpen }: PhoneBarProps) {
  return (
    <button type="button" class="askbar-bar phone" onClick={onOpen}>
      <span class="askbar-face" aria-hidden="true">
        <span class="avatar">
          <Face c={config.concierge} />
        </span>
        <span class="online" />
      </span>
      <span class="phone-text">
        <span class="phone-who">
          {config.concierge.name} · {config.concierge.disclosureLabel[lang]}
        </span>
        <span class="phone-hint">{hint}</span>
      </span>
      <span class="askbar-send" aria-hidden="true">
        <ArrowUpIcon size={18} />
      </span>
    </button>
  );
}

interface IntroProps {
  config: PublicConfig;
  s: UiStrings;
  lang: Lang;
  copy: PageCopy | undefined;
  suggestions: string[];
  starting: boolean;
  onStart: (first: string) => void;
  onClose: () => void;
  still?: boolean;
}

// Above the bar before a chat starts: the page's greeting, its questions and the notice (D35).
// Its X folds it back down into the bar.
export function Intro({ config, s, lang, copy, suggestions, starting, onStart, onClose, still }: IntroProps) {
  const [closing, setClosing] = useState(false);
  const chips = useRef<HTMLDivElement>(null);
  useOneRow(chips, suggestions.join('\n'));
  const close = () => {
    if (closing) return;
    const still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (still) return onClose();
    setClosing(true);
    setTimeout(onClose, 200);
  };
  return (
    <div class={`askbar-intro${still ? ' still' : ''}${closing ? ' closing' : ''}`}>
      <div class="askbar-hello">
        <span class="avatar sm" aria-hidden="true">
          <Face c={config.concierge} />
        </span>
        {/* The notice sits inside the greeting's box, so nothing floats loose (D35: it's seen before the first message). */}
        <div class="askbar-bubble">
          <button type="button" class="askbar-close" onClick={close} aria-label={s.close} title={s.close}>
            <CloseIcon size={14} />
          </button>
          <p class="askbar-greeting">{copy?.greeting?.[lang] ?? s.askbarHello(config.concierge.name)}</p>
          <p class="askbar-fine">
            {config.notice.text[lang]}{' '}
            <a href={config.notice.privacyUrl} target="_blank" rel="noopener noreferrer">
              {s.privacy}
            </a>
          </p>
        </div>
      </div>
      {suggestions.length > 0 && (
        <div class="askbar-chips" ref={chips}>
          {suggestions.slice(0, 3).map((q, i) => (
            <button type="button" class="chip" key={q} style={{ '--i': i }} disabled={starting} onClick={() => onStart(q)}>
              {q}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface CardTopProps {
  config: PublicConfig;
  s: UiStrings;
  lang: Lang;
  copy: PageCopy | undefined;
  onMinimize: () => void;
  onEnd: () => void;
  onExpand: () => void;
}

// The open conversation's top row: what this page is about, end, full screen, minimize.
export function CardTop({ config, s, lang, copy, onMinimize, onEnd, onExpand }: CardTopProps) {
  return (
    <div class="askbar-top">
      <span class="askbar-topic">
        {copy?.topic ? (
          <>
            {s.askingAbout} <strong>{copy.topic[lang]}</strong>
          </>
        ) : (
          <strong>{config.concierge.name}</strong>
        )}
      </span>
      <span class="askbar-tools">
        <button type="button" class="icon-btn" onClick={onEnd} aria-label={s.endChat} title={s.endChat}>
          <EndIcon size={16} />
        </button>
        {config.display.modes.includes('fullscreen') && (
          <button type="button" class="icon-btn" onClick={onExpand} aria-label={s.expand} title={s.expand}>
            <ExpandIcon size={16} />
          </button>
        )}
        <button type="button" class="icon-btn" onClick={onMinimize} aria-label={s.minimize} title={s.minimize}>
          <ChevronDownIcon size={18} />
        </button>
      </span>
    </div>
  );
}
