// Staff mode (D64): the team assistant on a private page (?mode=staff). Same knowledge as the
// guest concierge, plus coaching, practice calls, and the "questions Ava couldn't answer" report.
// Locally it's behind a passcode; the staff preview puts it behind real sign-in.
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Card, Lang, PublicConfig } from '@concierge/shared';
import * as api from '../api';
import { strings } from '../i18n';
import { applyTheme } from '../theme';
import { saveCardImage } from '../saveImage';
import { EndIcon, LockIcon } from '../icons';
import { MessageList, type UiMessage } from './Chat';
import { Composer, Unavailable } from './Chrome';
import { Face } from './Face';

let seq = 0;
const uid = () => `s${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 10)}`;

export function StaffApp() {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [failed, setFailed] = useState(false);
  const [unavailable, setUnavailable] = useState(false); // kill switch (D43)
  const [lang, setLang] = useState<Lang>('en');
  const [active, setActive] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [waiting, setWaiting] = useState(false);
  const [draft, setDraft] = useState('');
  const [code, setCode] = useState('');
  const [wrong, setWrong] = useState(false);
  const [entering, setEntering] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const s = strings(lang);

  useEffect(() => {
    (async () => {
      try {
        const cfg = await api.getConfig();
        applyTheme(cfg);
        setConfig(cfg);
        if (!cfg.available) return setUnavailable(true);
        const state = await api.getSession();
        if (state.active && state.audience === 'staff') {
          setLang(state.lang);
          setActive(true);
          setMessages(state.history.map((m) => ({ ...m, id: uid() })));
        }
      } catch {
        setFailed(true);
      }
    })();
  }, []);

  const enter = async (e: Event) => {
    e.preventDefault();
    if (!code.trim() || entering) return;
    setEntering(true);
    setWrong(false);
    try {
      const res = await api.startStaffSession(code.trim(), lang);
      setActive(true);
      setCode('');
      setMessages([{ role: 'assistant', text: res.greeting.text, cards: [], quickReplies: res.greeting.quickReplies, id: uid(), animate: true }]);
      setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 50);
    } catch (err) {
      if (api.isUnavailable(err)) setUnavailable(true);
      else setWrong(true);
    } finally {
      setEntering(false);
    }
  };

  const send = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean || waiting) return;
      setDraft('');
      setMessages((prev) => [...prev, { role: 'guest', text: clean, id: uid() }]);
      setWaiting(true);
      try {
        const res = await api.sendMessage(uid(), clean, lang);
        setMessages((prev) => [...prev, { role: 'assistant', ...res.reply, id: uid(), animate: true }]);
      } catch (err) {
        if (api.isUnavailable(err)) {
          setUnavailable(true);
        } else if (err instanceof api.ApiError && err.code === 'no_session') {
          setActive(false);
          setMessages([]);
        } else {
          setMessages((prev) => [...prev, { role: 'assistant', text: s.error(config?.phone ?? ''), cards: [], quickReplies: [], id: uid() }]);
        }
      } finally {
        setWaiting(false);
        inputRef.current?.focus({ preventScroll: true });
      }
    },
    [waiting, lang, config, s],
  );

  const end = async () => {
    await api.endSession().catch(() => {});
    setActive(false);
    setMessages([]);
    setDraft('');
  };

  const handlers = useMemo(
    () => ({
      onSend: (t: string) => send(t),
      onConfirm: () => {},
      onChangeDetails: () => {},
      onSave: (card: Card) => {
        if (config) saveCardImage(card, s, lang, config).catch(() => {});
      },
      busyActions: new Set<string>(),
      businessName: config?.businessName ?? '',
    }),
    [send, config, s, lang],
  );

  if (failed) return <div class="shell fullscreen staff"><div class="panel"><div class="welcome"><p class="sub">{s.error('')}</p></div></div></div>;
  if (!config) return <div class="shell fullscreen staff loading" aria-busy="true" />;

  return (
    <div class="shell fullscreen staff" lang={lang}>
      <div class="panel">
        <header class="top">
          <div class="identity">
            <div class="avatar" aria-hidden="true">
              <Face c={config.concierge} />
            </div>
            <div>
              <p class="name">
                {config.concierge.name}
                <span class="badge staff">{s.staffOnly}</span>
              </p>
              <p class="label">
                {s.teamAssistant} · {config.businessName}
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
              <button type="button" class="icon-btn with-label" onClick={end} title={s.endChat}>
                <EndIcon size={17} />
                <span class="btn-label">{s.endChat}</span>
              </button>
            )}
          </div>
        </header>
        {unavailable ? (
          <Unavailable s={s} businessName={config.businessName} phone={config.phone} bookingUrl={config.bookingUrl} />
        ) : active ? (
          <>
            <p class="notice-line">{s.staffNotice}</p>
            <MessageList
              messages={messages}
              waiting={waiting}
              face={config.concierge}
              name={config.concierge.name}
              s={s}
              lang={lang}
              handlers={handlers}
              onQuickReply={send}
            />
            <Composer s={s} value={draft} setValue={setDraft} disabled={waiting} onSubmit={() => send(draft)} inputRef={inputRef} placeholder={s.staffPlaceholder} />
          </>
        ) : (
          <form class="welcome staff-login" onSubmit={enter}>
            <div class="avatar xl" aria-hidden="true">
              <Face c={config.concierge} />
            </div>
            <h1>{s.staffWelcome}</h1>
            <p class="sub">{s.staffSub}</p>
            <div class="notice-box">
              <p>{s.staffNotice}</p>
            </div>
            <label class="code-field">
              <span>
                <LockIcon size={15} />
                {s.staffCode}
              </span>
              <input
                type="password"
                autocomplete="current-password"
                value={code}
                onInput={(e) => setCode((e.target as HTMLInputElement).value)}
                aria-invalid={wrong}
                aria-describedby={wrong ? 'code-error' : undefined}
              />
            </label>
            {wrong && (
              <p class="code-error" id="code-error" role="alert">
                {s.staffWrong}
              </p>
            )}
            <button type="submit" class="btn primary lg" disabled={entering || !code.trim()}>
              {s.staffEnter}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
