'use client'
/*
 * The wizard's frame: the focused header with the three parts, progress and
 * the jump menu, the current screen, Back and Continue, and the live preview.
 *
 * Answers save as the spa types. With a database configured they save to the
 * server per section, with version numbers (09-intake-wizard.md §7), for the
 * spa whose private link opened this browser (D83). Without one, the page is
 * an in-browser demo of the demo spa.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { type Answers, type SectionName, splitSections, withDefaults } from './answers'
import { Avatar } from './Avatar'
import { PART1 } from './screens/part1'
import { PART1B } from './screens/part1b'
import { PART2 } from './screens/part2'
import { PART3 } from './screens/part3'
import type { ApprovalStatus, Screen } from './screens/types'
import type { Spa } from './spa'
import { Btn, commitPendingAdds } from './ui'
import { displayName, genericConvo } from './voice'

const PARTS = ['Personality Protocol', 'Sales Playbook', 'Voice Calibration']
const SCREENS: Screen[] = [...PART1, ...PART1B, ...PART2, ...PART3]

/** What a screen still needs before Continue. */
/* A test spa (noRequired) skips required answers, but never the sign-off's own: name, title, and the tick. */
const needsOf = (s: Screen, a: Answers, spa: Spa) => (spa.noRequired && s.id !== 'signoff' ? [] : s.needs?.(a, spa) ?? [])
/**
 * Finished: answered as required, nothing missing, and the spa has moved on
 * past it (a later screen has been opened). Without that last part, a screen
 * counted the moment it opened, and one with a pre-selected answer (English on
 * Languages) counted before it was ever seen. The last screen has nothing
 * after it, so its own `done` decides.
 */
const isDone = (s: Screen, a: Answers, spa: Spa) => {
  const k = SCREENS.indexOf(s)
  const movedOn = k === SCREENS.length - 1 || SCREENS.slice(k + 1).some((x) => a.visited[x.id])
  return movedOn && s.done(a) && !needsOf(s, a, spa).length
}
/**
 * The first screen still missing something. Screens after it are locked, so
 * the jump menu, the part buttons, and "pick up" can't skip a required answer.
 */
const gateOf = (a: Answers, spa: Spa) => {
  const k = SCREENS.findIndex((s) => needsOf(s, a, spa).length > 0)
  return k < 0 ? SCREENS.length : k
}

/**
 * Takes the spa to a missing answer: scrolls it to the middle of the screen,
 * flashes it red once, and puts the cursor in its first control.
 */
function showNeed(at: string) {
  const el = document.querySelector<HTMLElement>(`[data-need="${at}"]`)
  if (!el) return
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'center' })
  el.classList.remove('flash')
  void el.offsetWidth // restart the flash if it's already playing
  el.classList.add('flash')
  el.addEventListener('animationend', () => el.classList.remove('flash'), { once: true })
  el.querySelector<HTMLElement>('input:not([type=hidden]), textarea, button')?.focus({ preventScroll: true })
}

/* Where the preview's "Asking about…" chip points, per screen. */
const TOPICS: Record<string, string> = {
  welcome: 'Getting started', tone: 'Botox', handoffs: 'Getting help', emergency: 'An urgent concern', pairs: 'Your voice', talk: 'Your voice',
  concerns: 'Your concerns', products: 'Skincare', growth: 'About us', promos: 'Specials and events', objections: 'Lip filler', tactics: 'Botox', sum2: 'Botox',
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'
/** ready: the form; nolink and badlink: no valid session; offline: the server couldn't be reached. */
type Status = 'loading' | 'ready' | 'nolink' | 'badlink' | 'offline'
type Saved = Record<string, { data: unknown; version: number }>

/**
 * JSON with object keys sorted, for telling whether a section changed. The
 * database stores sections as jsonb, which reorders keys, so plain JSON of the
 * same answers can differ and trigger saves that change nothing.
 */
const canon = (v: unknown): string => JSON.stringify(v, (_k, x: unknown) =>
  x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([p], [q]) => (p < q ? -1 : 1))) : x)

function useAnswers(demo: Spa) {
  const [spa, setSpa] = useState<Spa>(demo)
  const [status, setStatus] = useState<Status>('loading')
  const [a, setA] = useState<Answers | null>(null)
  const [save, setSave] = useState<SaveState>('idle')
  const [notice, setNotice] = useState('')
  const [approvals, setApprovals] = useState<ApprovalStatus[]>([])
  const server = useRef(false)
  /** Per section: the version the server last confirmed, and the JSON it holds. */
  const versions = useRef<Record<string, number>>({})
  const stored = useRef<Record<string, string>>({})
  const latest = useRef<Answers | null>(null)
  const queue = useRef<Promise<void>>(Promise.resolve())
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const localKey = `h1-onboarding-${demo.id}`

  const load = useCallback(async () => {
    let res: Response
    try { res = await fetch('/api/onboarding/state', { cache: 'no-store' }) } catch { setStatus('offline'); return }
    if (res.status === 501) {
      let saved = null
      try { saved = JSON.parse(localStorage.getItem(localKey) ?? 'null') } catch { /* unreadable: start fresh */ }
      const next = withDefaults(saved, demo)
      latest.current = next
      setA(next)
      setStatus('ready')
      return
    }
    if (res.status === 401) { setStatus(new URLSearchParams(location.search).get('link') === 'invalid' ? 'badlink' : 'nolink'); return }
    if (!res.ok) { setStatus('offline'); return }
    const body = await res.json() as { spa: Spa; sections: Saved; approvals: ApprovalStatus[] }
    server.current = true
    setApprovals(body.approvals)
    versions.current = Object.fromEntries(Object.entries(body.sections).map(([k, v]) => [k, v.version]))
    stored.current = Object.fromEntries(Object.entries(body.sections).map(([k, v]) => [k, canon(v.data)]))
    const next = withDefaults(Object.assign({}, ...Object.values(body.sections).map((v) => v.data)), body.spa)
    latest.current = next
    setSpa(body.spa)
    setA(next)
    setStatus('ready')
    if (location.search) history.replaceState(null, '', location.pathname)
  }, [demo, localKey])

  useEffect(() => { void load() }, [load])

  /* Sends each section that changed since the server last confirmed it. One
     save at a time, so versions stay in order. */
  const flush = useCallback(() => {
    queue.current = queue.current.then(async () => {
      const cur = latest.current
      if (!cur) return
      for (const [section, data] of Object.entries(splitSections(cur)) as [SectionName, unknown][]) {
        const text = canon(data)
        if (stored.current[section] === text) continue
        const res = await fetch('/api/onboarding/sections', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ section, data, version: versions.current[section] ?? 0 }),
        })
        if (res.status === 409) {
          setNotice('This form was changed in another window or on another device, so we loaded the latest answers. Check your last change is still there.')
          await load()
          return
        }
        if (res.status === 401) { setStatus('nolink'); return }
        if (!res.ok) throw new Error(`save failed: ${res.status}`)
        versions.current[section] = ((await res.json()) as { version: number }).version
        stored.current[section] = text
      }
      setSave('saved')
    }).catch(() => setSave('error'))
  }, [load])

  /* Leaving the page saves what's waiting rather than dropping it. */
  useEffect(() => {
    const now = () => { if (document.visibilityState === 'hidden' && server.current) { clearTimeout(timer.current); flush() } }
    document.addEventListener('visibilitychange', now)
    return () => document.removeEventListener('visibilitychange', now)
  }, [flush])

  const set = useCallback((edit: (draft: Answers) => void) => {
    setA((prev) => {
      if (!prev) return prev
      const next = structuredClone(prev)
      edit(next)
      latest.current = next
      setSave('saving')
      clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        if (server.current) { flush(); return }
        try { localStorage.setItem(localKey, JSON.stringify(next)); setSave('saved') } catch { setSave('error') }
      }, 400)
      return next
    })
  }, [flush, localKey])

  /** Saves anything waiting now, and resolves when every save so far is done. */
  const whenSaved = useCallback(async () => {
    if (!server.current) return
    clearTimeout(timer.current)
    flush()
    await queue.current
  }, [flush])

  return { status, spa, a, set, save, notice, clearNotice: () => setNotice(''), server: server.current, whenSaved, approvals, setApprovals }
}

/** Shown when there's no valid session: the form opens only from a spa's private link (D83). */
function NoLink({ status }: { status: Status }) {
  const [h, p] = status === 'badlink'
    ? ['That link isn’t working', 'It may have been replaced by a newer one. Use the most recent link H1 sent you, or ask us for a new one.']
    : status === 'offline'
      ? ['We couldn’t load your form', 'Check your connection and reload the page. Your saved answers are safe.']
      : ['Open your private link', 'This form opens from the private link H1 sent you. Use that link on each device you want to fill it in on.']
  return (
    <div className="ob">
      <header className="hdr">
        <div className="hdr-in">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/onboarding/h1-logo-wordmark-purple.svg" alt="H1 AI Consulting" width={95} height={58} />
          <div className="hdr-title">Personality Protocol &amp; Sales Playbook</div>
        </div>
      </header>
      <main className="nolink screen">
        <h1>{h}</h1>
        <p className="why">{p}</p>
        {status !== 'offline' && (
          <p className="note">Lost your link? Ask your H1 contact, or email <a className="link" href="mailto:hello@h1aiconsulting.com">hello@h1aiconsulting.com</a>, and we’ll send you a new one.</p>
        )}
      </main>
    </div>
  )
}

/* Controls whose hover opens from where the pointer came in. */
const ALIVE = '.btn, .choice, .idea'

/**
 * Records where the pointer entered a control, as --enter-angle, so an outline
 * pill draws its ring from that side. The same calculation as the site's
 * alive.js, which this page does not load.
 */
function usePointerEntry() {
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const onOver = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.(ALIVE) as HTMLElement | null
      if (!el || (e.relatedTarget instanceof Node && el.contains(e.relatedTarget))) return
      const box = el.getBoundingClientRect()
      if (!box.width || !box.height) return
      const deg = (Math.atan2(e.clientY - (box.top + box.height / 2), e.clientX - (box.left + box.width / 2)) * 180) / Math.PI + 90
      el.style.setProperty('--enter-angle', `${deg.toFixed(1)}deg`)
    }
    document.addEventListener('pointerover', onOver, { passive: true })
    return () => document.removeEventListener('pointerover', onOver)
  }, [])
}

/**
 * The jump menu: every screen, grouped by part, numbered, with a tick on the
 * finished ones and the current one marked. A disclosure rather than a native
 * select, so its open list matches the site; Esc or a click outside closes it.
 */
function JumpMenu({ a, spa, cur, go }: { a: Answers; spa: Spa; cur: Screen; go: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    root.current?.querySelector<HTMLElement>('[aria-current="step"]')?.focus()
    const onDown = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus() } }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])
  const n = SCREENS.indexOf(cur) + 1
  const gate = gateOf(a, spa)
  return (
    <div className="jump-wrap" ref={root}>
      <button ref={btn} type="button" className="jump" aria-expanded={open} aria-controls="jump-list" onClick={() => setOpen((o) => !o)}>
        <span className="jump__n">{n}</span>
        <span className="jump__t">{cur.title}</span>
        <svg className="jump__chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && (
        <div className="jump-list" id="jump-list" role="region" aria-label="All screens">
          {PARTS.map((p, pi) => {
            const list = SCREENS.filter((s) => s.part === pi)
            if (!list.length) return null
            return (
              <div key={p} className="jump-part">
                <p className="jump-part__h">Part {pi + 1}: {p}</p>
                <ol>
                  {list.map((s) => {
                    const done = isDone(s, a, spa), here = s.id === cur.id, locked = SCREENS.indexOf(s) > gate
                    return (
                      <li key={s.id}>
                        <button type="button" className={`jump-item${here ? ' on' : ''}${done ? ' done' : ''}`} disabled={locked}
                          title={locked ? 'Finish the earlier screens first' : undefined}
                          aria-current={here ? 'step' : undefined} onClick={() => { setOpen(false); go(s.id) }}>
                          <span className="jump-item__n" aria-hidden="true">{done ? '' : SCREENS.indexOf(s) + 1}</span>
                          <span>{s.title}</span>
                          <span className="sr-only">{done ? ', complete' : locked ? ', locked until earlier screens are finished' : ''}</span>
                        </button>
                      </li>
                    )
                  })}
                </ol>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/** `demo` is the spa shown when no database is configured; otherwise the session decides. */
export function Wizard({ demo }: { demo: Spa }) {
  const { status, spa, a, set, save, notice, clearNotice, server, whenSaved, approvals, setApprovals } = useAnswers(demo)
  usePointerEntry()
  const [peek, setPeek] = useState(false)
  const [continueAfter, setContinueAfter] = useState(false)

  /* The saved screen, unless it's now locked behind a missing answer: then the
     first screen that still needs something. */
  const saved = SCREENS.find((s) => s.id === a?.cur) ?? SCREENS[0]!
  const gateNow = a ? gateOf(a, spa) : SCREENS.length
  const cur = SCREENS.indexOf(saved) > gateNow ? SCREENS[gateNow]! : saved
  useEffect(() => {
    if (a && !a.visited[cur.id]) set((d) => { d.visited[cur.id] = true })
  }, [a, cur.id, set])

  const go = useCallback((id: string) => {
    commitPendingAdds()
    set((d) => { d.cur = id })
    setPeek(false)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [set])

  /* Continue, finished after pending "add" text was added (see the button). */
  useEffect(() => {
    if (!continueAfter || !a) return
    setContinueAfter(false)
    const n = needsOf(cur, a, spa)
    if (n[0]) showNeed(n[0].at)
    else { const k = SCREENS.indexOf(cur); if (k < SCREENS.length - 1) go(SCREENS[k + 1]!.id) }
  }, [continueAfter, a, cur, spa, go])

  if (status !== 'ready' && status !== 'loading') return <NoLink status={status} />
  if (!a) return <div className="ob" />

  const i = SCREENS.indexOf(cur)
  const isLast = i === SCREENS.length - 1
  const next = () => { if (!isLast) go(SCREENS[i + 1]!.id) }
  const doneN = SCREENS.filter((s) => isDone(s, a, spa)).length
  const needs = needsOf(cur, a, spa)
  const gate = gateOf(a, spa)
  /* The furthest screen they've opened. When they've gone back to change
     something, this takes them straight back there; it shows only when
     Continue wouldn't already. */
  const furthest = Math.min(gate, SCREENS.reduce((m, s, k) => (a.visited[s.id] ? k : m), 0))
  const resume = !needs.length && furthest > i + 1 ? SCREENS[furthest] : undefined
  const partPct = (p: number) => {
    const list = SCREENS.filter((s) => s.part === p)
    return list.length ? Math.round((100 * list.filter((s) => isDone(s, a, spa)).length) / list.length) : 0
  }

  return (
    <div className="ob">
      <header className="hdr">
        <div className="hdr-in">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/onboarding/h1-logo-wordmark-purple.svg" alt="H1 AI Consulting" width={95} height={58} />
          <div className="hdr-title">Personality Protocol &amp; Sales Playbook<small>{spa.name}</small></div>
          <nav className="parts" aria-label="Parts">
            {PARTS.map((n, p) => {
              const open = SCREENS.filter((s, k) => s.part === p && k <= gate)
              const first = open.find((s) => !isDone(s, a, spa)) ?? open[0]
              return (
                <button key={n} type="button" className={`part${cur.part === p ? ' on' : ''}`} disabled={!first}
                  aria-current={cur.part === p ? 'step' : undefined} aria-label={`Part ${p + 1}: ${n}, ${partPct(p)}% complete`}
                  onClick={() => first && go(first.id)}>
                  <span className="ring" style={{ ['--p' as string]: partPct(p) }}><span>{p + 1}</span></span><b>{n}</b>
                </button>
              )
            })}
          </nav>
          <div className="save" aria-live="polite">{save === 'saving' ? 'Saving…' : save === 'saved' ? 'Saved' : save === 'error' ? 'Not saved' : ''}</div>
        </div>
      </header>

      <div className={`wrap${cur.wide ? ' wide' : ''}`}>
        <main>
          {notice && (
            <div className="warn notice" role="status">
              {notice} <button type="button" className="link" onClick={clearNotice}>Dismiss</button>
            </div>
          )}
          <div className="crumbs">
            <JumpMenu a={a} spa={spa} cur={cur} go={go} />
            <div className="row" style={{ flex: 1, justifyContent: 'flex-end' }}>
              <span className="note" style={{ margin: 0 }}>{doneN} of {SCREENS.length} complete</span>
              <div className="bar"><i style={{ width: `${Math.round((100 * doneN) / SCREENS.length)}%` }} /></div>
            </div>
          </div>

          {/* Keyed by screen, so each screen's blocks run their entrance when it opens. */}
          <div className="screen" key={cur.id}>
            <cur.Render a={a} spa={spa} set={set} next={next} go={go} server={server} whenSaved={whenSaved} approvals={approvals} setApprovals={setApprovals} />
          </div>

          {needs.length > 0 && (
            <div className="needs" role="status">
              <b>To continue:</b>
              <ul>{needs.map((n) => (
                <li key={n.msg}><button type="button" className="needs__go" onClick={() => showNeed(n.at)}>{n.msg}</button></li>
              ))}</ul>
            </div>
          )}
          <div className="nav">
            {i > 0 ? <Btn variant="outline" onClick={() => go(SCREENS[i - 1]!.id)}>Back</Btn> : <span />}
            <div className="nav__end">
              {!isLast && (
                <Btn onClick={() => {
                  /* Anything still typed in an "add" box is added first; then Continue
                     decides on the next render, with those answers counted. */
                  if (commitPendingAdds()) setContinueAfter(true)
                  else if (needs[0]) showNeed(needs[0].at)
                  else next()
                }}>
                  {cur.id === 'welcome' ? 'Start Part 1' : cur.id === 'sum1' ? 'Start Part 2' : cur.id === 'sum2' ? 'Start Part 3' : 'Continue'}
                </Btn>
              )}
              {resume && (
                <Btn variant="outline" onClick={() => go(resume.id)} aria-label={`Pick up where you left off: ${resume.title}`}>
                  Pick up where you left off
                </Btn>
              )}
            </div>
          </div>
        </main>

        {!cur.wide && (
          <aside className={`stage${peek ? ' open' : ''}`} aria-label="Live preview">
            <Preview a={a} spa={spa} screen={cur} onClose={peek ? () => setPeek(false) : undefined} />
          </aside>
        )}
      </div>
      {!cur.wide && <Btn className="peek" onClick={() => setPeek(true)}>Preview your coordinator</Btn>}
    </div>
  )
}

/**
 * The answers as they were once the spa stopped typing for a moment. The
 * preview shows these, so a change animates in once it is made, not on every
 * keystroke while a name is being typed.
 */
function useSettled<T>(value: T, ms = 350) {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setSettled(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return settled
}

function Preview({ a: live, spa, screen, onClose }: { a: Answers; spa: Spa; screen: Screen; onClose?: (() => void) | undefined }) {
  const a = useSettled(live)
  const msgs = (screen.preview ?? genericConvo)(a, spa)
  const book = a.terms.book === '__other' ? (a.termsOther.book.trim() || 'book a consult') : a.terms.book
  const lastBot = msgs.map((m) => m.r).lastIndexOf('bot')
  const generic = a.nameStyle === 'generic'
  const label = generic ? 'AI Treatment Coordinator' : (displayName(a.name) || 'Your coordinator')
  const sub = generic ? spa.name : (a.subtitle || 'AI Treatment Coordinator')
  const msgsRef = useRef<HTMLDivElement>(null)
  useEffect(() => { msgsRef.current?.scrollTo({ top: msgsRef.current.scrollHeight }) })
  /* Keyed by the look, so a new photo or icon fades in rather than swapping. */
  /* No face until the spa picks a look (Choose a look, on the Design screen). */
  const avKey = a.picked.look ? `${a.avType}-${a.avId}` : 'none'
  const av = <Avatar key={avKey} type={a.picked.look ? a.avType : 'none'} id={a.avId} initial={spa.short[0] ?? ''} />

  return (
    <div className="stage-in">
      <div className="stage-lbl">
        <span><b>Style preview</b></span>
        <span>{spa.website}</span>
        {onClose && <Btn variant="outline" small onClick={onClose} style={{ color: '#fff', borderColor: 'var(--line-700)' }}>Close</Btn>}
      </div>
      <div className="site" role="img" aria-label="Preview of your AI Treatment Coordinator on your website">
        <div className="ask">
          <div className="ask-card">
            <div className="ask-top">
              <span>Asking about <strong>{screen.topic?.(a) ?? TOPICS[screen.id] ?? 'Lip filler'}</strong></span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
            </div>
            <div className="ask-msgs" ref={msgsRef}>
              {/* Keyed by text, so a reply that changes fades in as the new wording. */}
              {msgs.map((m, k) => m.r === 'meta' ? <div key={`${k}${m.t}`} className="am-meta">{m.t}</div>
                : m.r === 'gst' ? <div key={`${k}${m.t}`} className="am-g swap" style={{ ['--i' as string]: k }}>{m.t}</div>
                : (
                  <div key={`${k}${m.t}`} className={`am-b swap${m.r === 'alert' ? ' alert' : ''}`} style={{ ['--i' as string]: k }}>
                    {av}
                    <div className="bub">
                      <span>{m.t}</span>
                      {k === lastBot && m.t.toLowerCase().includes(book.toLowerCase()) && (
                        <span className="am-cta">{book.charAt(0).toUpperCase() + book.slice(1)}</span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
            <div className="ask-disc">You’re chatting with AI. It can’t give medical advice.</div>
          </div>
          <div className="ask-bar">
            <span className="ask-av">{av}<i /></span>
            <span className="ask-lbl"><b key={label} className="swap">{label}</b>{sub && <small key={sub} className="swap">{sub}</small>}</span>
            <span className="ask-in">Ask a follow-up…</span>
            <span className="ask-send"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5" /><path d="M6 11l6-6 6 6" /></svg></span>
          </div>
        </div>
      </div>
      <p className="stage-note">A style preview, not the live chat. Shown in your brand colors and fonts from onboarding; sample replies only.</p>
    </div>
  )
}
