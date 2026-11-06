import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Card, FeedbackReason, Lang, PublicConfig, Reply } from '@concierge/shared';
import * as api from './api';
import { strings } from './i18n';
import { applyTheme } from './theme';
import { saveCardImage } from './saveImage';
import { Composer, Header, NoticeLine, Unavailable, Welcome } from './components/Chrome';
import { MessageList, type UiMessage } from './components/Chat';

const params = new URLSearchParams(location.search);
const MODE: 'inline' | 'fullscreen' = params.get('mode') === 'fullscreen' ? 'fullscreen' : 'inline';
const PAGE = params.get('page')?.slice(0, 200) || undefined;
// A question the site attached to an "Ask about..." button (data-concierge-question).
const PRESET = params.get('q')?.slice(0, 200) || undefined;

let seq = 0;
const uid = () => `${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 10)}`;

// Only UI events cross to the host page; never conversation content or the session (D30, D53).
function toParent(type: 'concierge:close' | 'concierge:open', extra: Record<string, string> = {}) {
  window.parent?.postMessage({ type, ...extra }, '*');
}

function pickLang(config: PublicConfig): Lang {
  const prefersSpanish = navigator.language?.toLowerCase().startsWith('es');
  return prefersSpanish && config.languages.includes('es') ? 'es' : (config.languages[0] ?? 'en');
}

export function App() {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [failed, setFailed] = useState(false);
  // Kill switch (D43): paused, or the API can't be reached and only the deploy-time fallback is left.
  const [unavailable, setUnavailable] = useState(false);
  const [fallback, setFallback] = useState<api.Fallback | null>(null);
  const [lang, setLang] = useState<Lang>('en');
  const [active, setActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [waiting, setWaiting] = useState(false);
  const [draft, setDraft] = useState('');
  const [busyActions, setBusyActions] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const presetUsed = useRef(false);

  const s = strings(lang);

  const restore = useCallback(async () => {
    const state = await api.getSession();
    // A staff session in the same browser doesn't belong in the guest chat.
    const active = state.active && state.audience !== 'staff';
    setActive(active);
    if (active) {
      setLang(state.lang);
      setMessages(state.history.map((m) => ({ ...m, id: uid() })));
    } else {
      setMessages([]);
    }
    return active;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const cfg = await api.getConfig();
        applyTheme(cfg);
        setConfig(cfg);
        setLang(pickLang(cfg));
        if (!cfg.available) setUnavailable(true);
        else await restore();
      } catch {
        setFallback(await api.getFallback());
        setFailed(true);
      }
    })();
    // The loader asks inline frames to refresh after the full-screen view closes.
    const onMessage = (e: MessageEvent) => {
      if (e.source === window.parent && e.data?.type === 'concierge:refresh') restore().catch(() => {});
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && MODE === 'fullscreen') toParent('concierge:close');
    };
    window.addEventListener('message', onMessage);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('message', onMessage);
      window.removeEventListener('keydown', onKey);
    };
  }, [restore]);

  const pushReply = (reply: Reply, animate = true) =>
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', replyId: reply.replyId, text: reply.text, cards: reply.cards, quickReplies: reply.quickReplies, id: uid(), animate },
    ]);

  // Any failure still ends at a booking link and the phone number (D23).
  const errorReply = (): Reply => ({
    text: s.error(config?.phone ?? ''),
    cards: config ? [{ type: 'booking_link', purpose: 'book', url: config.bookingUrl }] : [],
    quickReplies: [],
  });

  const send = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean || waiting) return;
      setDraft('');
      setMessages((prev) => [...prev, { role: 'guest', text: clean, id: uid() }]);
      setWaiting(true);
      try {
        const res = await api.sendMessage(uid(), clean, lang, PAGE);
        pushReply(res.reply);
      } catch (err) {
        if (api.isUnavailable(err)) {
          setUnavailable(true);
        } else if (err instanceof api.ApiError && err.code === 'no_session') {
          setActive(false);
          setMessages([]);
        } else {
          pushReply(errorReply());
        }
      } finally {
        setWaiting(false);
        inputRef.current?.focus({ preventScroll: true });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [waiting, lang, config],
  );

  const start = useCallback(
    async (first?: string) => {
      if (!config || starting) return;
      setStarting(true);
      try {
        const res = await api.startSession(lang, config.notice.version, PAGE, MODE);
        setActive(true);
        setMessages([{ role: 'assistant', text: res.greeting.text, cards: [], quickReplies: first ? [] : res.greeting.quickReplies, id: uid(), animate: true }]);
        if (first) await send(first);
        else setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 50);
      } catch (err) {
        if (api.isUnavailable(err)) {
          setUnavailable(true);
        } else if (err instanceof api.ApiError && err.code === 'notice_outdated') {
          const cfg = await api.getConfig().catch(() => null);
          if (cfg) setConfig(cfg);
        } else {
          setFailed(true);
        }
      } finally {
        setStarting(false);
      }
    },
    [config, starting, lang, send],
  );

  // Opened from an "Ask about..." button: send the site's question once the chat is ready.
  useEffect(() => {
    if (!config || !PRESET || presetUsed.current) return;
    presetUsed.current = true;
    if (active) send(PRESET);
  }, [config, active, send]);

  const confirm = async (actionId: string) => {
    setBusyActions((prev) => new Set(prev).add(actionId));
    try {
      const res = await api.confirmAction(actionId);
      setMessages((prev) =>
        prev.map((m) => ({
          ...m,
          animate: false,
          cards: m.cards?.map((c) => (c.type === 'confirm' && c.actionId === actionId ? { ...c, status: res.status } : c)),
        })),
      );
      pushReply(res.reply);
    } catch (err) {
      if (api.isUnavailable(err)) setUnavailable(true);
      else pushReply(errorReply());
    } finally {
      setBusyActions((prev) => {
        const next = new Set(prev);
        next.delete(actionId);
        return next;
      });
    }
  };

  // Shows the rating straight away; the server keeps it with the chat for the summary (9.5).
  const rate = (replyId: string, rating: 'up' | 'down', reason?: FeedbackReason) => {
    setMessages((prev) =>
      prev.map((m) => (m.replyId === replyId ? { ...m, animate: false, feedback: rating === 'down' && reason ? { rating, reason } : { rating } } : m)),
    );
    api.sendFeedback(replyId, rating, reason).catch((err) => {
      if (api.isUnavailable(err)) setUnavailable(true);
    });
  };

  const end = async () => {
    await api.endSession().catch(() => {});
    setActive(false);
    setMessages([]);
    setDraft('');
  };

  const handlers = useMemo(
    () => ({
      onSend: (t: string) => send(t),
      onConfirm: confirm,
      onChangeDetails: () => {
        setDraft(s.changeText);
        inputRef.current?.focus({ preventScroll: true });
      },
      // Drawn on the visitor's device; nothing is uploaded (D63).
      onSave: (card: Card) => {
        if (config) saveCardImage(card, s, lang, config).catch(() => {});
      },
      busyActions,
      businessName: config?.businessName ?? '',
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [send, busyActions, s, config, lang],
  );

  const close = MODE === 'fullscreen' ? () => toParent('concierge:close') : undefined;
  if (failed && fallback) {
    return (
      <div class={`shell ${MODE}`}>
        <div class="panel">
          <Unavailable s={s} businessName={fallback.businessName} phone={fallback.phone} bookingUrl={fallback.bookingUrl} onClose={close} />
        </div>
      </div>
    );
  }
  if (failed) {
    return (
      <div class={`shell ${MODE}`}>
        <div class="panel">
          <div class="welcome">
            <p class="sub">{strings(lang).error(config?.phone ?? '')}</p>
          </div>
        </div>
      </div>
    );
  }
  if (!config) return <div class={`shell ${MODE} loading`} aria-busy="true" />;

  if (unavailable) {
    return (
      <div class={`shell ${MODE}`} lang={lang}>
        <div class="panel">
          <Header config={config} s={s} lang={lang} setLang={setLang} active={false} mode={MODE} onEnd={end} onExpand={() => toParent('concierge:open')} onClose={() => toParent('concierge:close')} />
          <Unavailable s={s} businessName={config.businessName} phone={config.phone} bookingUrl={config.bookingUrl} />
        </div>
      </div>
    );
  }

  const suggestions = (PAGE && config.suggested.pages[PAGE]?.[lang]) || config.suggested.default[lang];

  return (
    <div class={`shell ${MODE}`} lang={lang}>
      <div class="panel">
        <Header
          config={config}
          s={s}
          lang={lang}
          setLang={setLang}
          active={active}
          mode={MODE}
          onEnd={end}
          onExpand={() => toParent('concierge:open')}
          onClose={() => toParent('concierge:close')}
        />
        {active ? (
          <>
            <NoticeLine config={config} s={s} lang={lang} />
            <MessageList
              messages={messages}
              waiting={waiting}
              initials={config.concierge.initials}
              name={config.concierge.name}
              s={s}
              lang={lang}
              handlers={handlers}
              onQuickReply={send}
              onRate={rate}
            />
            <Composer s={s} value={draft} setValue={setDraft} disabled={waiting} onSubmit={() => send(draft)} inputRef={inputRef} />
          </>
        ) : (
          <Welcome config={config} s={s} lang={lang} suggestions={suggestions} starting={starting} onStart={(q) => start(q ?? PRESET)} />
        )}
      </div>
    </div>
  );
}
