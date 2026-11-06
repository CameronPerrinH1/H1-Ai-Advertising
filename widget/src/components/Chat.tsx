import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { DisplayMessage, Feedback, FeedbackReason, Lang } from '@concierge/shared';
import type { UiStrings } from '../i18n';
import { CardView, type CardHandlers } from './Cards';
import { ThumbDownIcon, ThumbUpIcon } from '../icons';

export interface UiMessage extends DisplayMessage {
  id: string;
  animate?: boolean;
}

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

function plain(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/^\s*[-*]\s+/gm, '• ');
}

// Reveals a reply that has already passed the output checks (D8, D13): it looks like
// streaming, but nothing unchecked is ever shown. Screen readers get the full text at once.
function TypeOn({ text, animate, onDone, onTick }: { text: string; animate: boolean; onDone: () => void; onTick: () => void }) {
  const [n, setN] = useState(animate ? 0 : text.length);
  const done = useRef(onDone);
  const tick = useRef(onTick);
  done.current = onDone;
  tick.current = onTick;

  useEffect(() => {
    if (!animate || reducedMotion() || text.length === 0) {
      setN(text.length);
      done.current();
      return;
    }
    let raf = 0;
    const start = performance.now();
    const duration = Math.min(1800, Math.max(350, text.length * 11));
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setN(Math.ceil((1 - (1 - p) ** 2) * text.length));
      tick.current();
      if (p < 1) raf = requestAnimationFrame(step);
      else done.current();
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [text, animate]);

  return (
    <>
      <span class="sr-only">{text}</span>
      <span class="msg-text" aria-hidden="true">
        {text.slice(0, n)}
        {n < text.length && <span class="caret" />}
      </span>
    </>
  );
}

// Thumbs up or down on an answer (build plan 9.5). A thumbs-down offers three one-tap reasons, never
// free text, and flags the chat for a person to review (D69).
function Rate({ feedback, s, onRate }: { feedback?: Feedback; s: UiStrings; onRate: (rating: 'up' | 'down', reason?: FeedbackReason) => void }) {
  const [asking, setAsking] = useState(false);
  const reasons: [FeedbackReason, string][] = [
    ['wrong_info', s.reasonWrongInfo],
    ['didnt_understand', s.reasonDidntUnderstand],
    ['other', s.reasonOther],
  ];
  return (
    <div class="rate">
      <div class="rate-buttons" role="group" aria-label={s.rateReply}>
        <button type="button" class="rate-btn" aria-pressed={feedback?.rating === 'up'} aria-label={s.helpful} title={s.helpful} onClick={() => { setAsking(false); onRate('up'); }}>
          <ThumbUpIcon size={15} />
        </button>
        <button type="button" class="rate-btn" aria-pressed={feedback?.rating === 'down'} aria-label={s.notHelpful} title={s.notHelpful} onClick={() => { setAsking(true); onRate('down'); }}>
          <ThumbDownIcon size={15} />
        </button>
      </div>
      {asking && !feedback?.reason && (
        <div class="rate-reasons" role="group" aria-label={s.whatWentWrong}>
          <span class="small muted">{s.whatWentWrong}</span>
          {reasons.map(([reason, label]) => (
            <button type="button" class="chip small" key={reason} onClick={() => { setAsking(false); onRate('down', reason); }}>
              {label}
            </button>
          ))}
        </div>
      )}
      {feedback?.rating === 'down' && feedback.reason && (
        <span class="small muted" role="status">
          {s.thanksFeedback}
        </span>
      )}
    </div>
  );
}

interface ListProps {
  messages: UiMessage[];
  waiting: boolean;
  initials: string;
  name: string;
  s: UiStrings;
  lang: Lang;
  handlers: CardHandlers;
  onQuickReply: (text: string) => void;
  onRate?: (replyId: string, rating: 'up' | 'down', reason?: FeedbackReason) => void; // guest chats only
}

export function MessageList({ messages, waiting, initials, name, s, lang, handlers, onQuickReply, onRate }: ListProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set(messages.filter((m) => !m.animate).map((m) => m.id)));
  const stick = useRef(true);

  const onScroll = () => {
    const el = scroller.current;
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };
  const toBottom = () => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  };

  useLayoutEffect(() => {
    stick.current = true;
    toBottom();
  }, [messages.length, waiting]);

  // Cards and chips appear after the text finishes typing; keep them in view as they arrive.
  useEffect(() => {
    const id = setTimeout(toBottom, 60);
    const late = setTimeout(toBottom, 700);
    return () => {
      clearTimeout(id);
      clearTimeout(late);
    };
  }, [revealed]);

  // Messages restored from the server (no animation) count as revealed straight away.
  useEffect(() => {
    setRevealed((prev) => {
      const next = new Set(prev);
      for (const m of messages) if (!m.animate) next.add(m.id);
      return next;
    });
  }, [messages]);

  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');

  return (
    <div class="messages" ref={scroller} onScroll={onScroll} role="log" aria-live="polite" aria-relevant="additions">
      {messages.map((m) =>
        m.role === 'guest' ? (
          <div class="row guest" key={m.id}>
            <div class="bubble guest">{m.text}</div>
          </div>
        ) : (
          <div class="row assistant" key={m.id}>
            <div class="avatar sm" aria-hidden="true">
              {initials}
            </div>
            <div class="stack">
              {/* Urgent help never waits for the typing animation (D14). */}
              {(m.cards ?? [])
                .filter((card) => card.type === 'urgent')
                .map((card, i) => (
                  <div class="card-wrap now" key={`${m.id}-urgent-${i}`}>
                    <CardView card={card} s={s} lang={lang} h={handlers} />
                  </div>
                ))}
              {m.text && (
                <div class="bubble assistant">
                  <TypeOn
                    text={plain(m.text)}
                    animate={!!m.animate && !revealed.has(m.id)}
                    onTick={toBottom}
                    onDone={() =>
                      setRevealed((prev) => {
                        if (prev.has(m.id)) return prev;
                        const next = new Set(prev);
                        next.add(m.id);
                        return next;
                      })
                    }
                  />
                </div>
              )}
              {(revealed.has(m.id) || !m.text) &&
                (m.cards ?? []).filter((card) => card.type !== 'urgent').map((card, i) => (
                  <div class="card-wrap" style={{ '--i': i }} key={`${m.id}-${i}`}>
                    <CardView card={card} s={s} lang={lang} h={handlers} />
                  </div>
                ))}
              {onRate && m.replyId && revealed.has(m.id) && (
                <Rate feedback={m.feedback} s={s} onRate={(rating, reason) => onRate(m.replyId!, rating, reason)} />
              )}
              {m === lastAssistant && !waiting && revealed.has(m.id) && (m.quickReplies?.length ?? 0) > 0 && (
                <div class="quick" role="group">
                  {m.quickReplies!.map((q) => (
                    <button type="button" class="chip" key={q} onClick={() => onQuickReply(q)}>
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ),
      )}
      {waiting && (
        <div class="row assistant">
          <div class="avatar sm" aria-hidden="true">
            {initials}
          </div>
          <div class="bubble assistant typing">
            <span class="sr-only">{s.typing(name)}</span>
            <span class="dot" />
            <span class="dot" />
            <span class="dot" />
          </div>
        </div>
      )}
    </div>
  );
}
