'use client'
/*
 * Part 3: Voice Calibration. The role-play, the whole playbook in one place
 * with sign-off, and what happens next.
 *
 * Sign-off: the person filling in the form approves it here, with their name,
 * title, and an attestation. Nothing is emailed. The server records which
 * version of the answers they approved (D74), so a later change needs signing
 * again.
 */
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { type Answers, answersHash, type RpMsg } from '../answers'
import { HANDOFF, ICONS, NEVER, OBJ, PRICE_OVR, PRICING, PRIORITY, SCENARIOS, SIGNOFFS, TACTICS, TONES } from '../content'
import type { Spa } from '../spa'
import { Btn, Check, Field, Head, Text } from '../ui'
import { coordName, greetingText, handoffText, terms, toneReply, voice } from '../voice'
import { evergreenWhen, evWhen, fmtDate, MONTHS, productLabel } from './part2'
import { type ApprovalStatus, needList, type Screen } from './types'

export const P3 = 'Part 3 of 3: Voice Calibration'


/** The scenarios this spa sees: the Spanish one only if Spanish is on. */
const scenarios = (a: Answers) => SCENARIOS.filter((s) => !s.lang || a.languages.includes(s.lang))

/* ---------- Role-play ---------- */

const roleplay: Screen = {
  id: 'roleplay', part: 2, title: 'Calibrate your voice', wide: true,
  done: (a) => !!a.visited.roleplay,
  needs: (a) => {
    const left = scenarios(a).filter((s) => !a.rp.done[s.id])
    return left.length ? [{ msg: `Finish ${left.length === 1 ? 'the last scenario' : `${left.length} more scenarios`}, starting with “${left[0]!.t}”`, at: 'rp' }] : []
  },
  Render: function Roleplay({ a, set, go }) {
    const list = scenarios(a)
    const sc = list.find((s) => s.id === a.rp.cur) ?? list[0]!
    const k = list.indexOf(sc)
    const log: RpMsg[] = a.rp.logs[sc.id] ?? [{ r: 'g', t: sc.open }]
    const done = !!a.rp.done[sc.id]
    /* Per scenario: unsent text stays with its own conversation, and "typing…"
       shows only in the scenario the guest is replying in. */
    /* Saved with the spa's place in the form, so leaving the screen keeps them. */
    const draft = a.rpDrafts[sc.id] ?? ''
    const setDraft = (v: string) => set((d) => { d.rpDrafts[sc.id] = v })
    const [typingIn, setTypingIn] = useState<string | null>(null)
    const typing = typingIn === sc.id
    const body = useRef<HTMLDivElement>(null)
    const input = useRef<HTMLTextAreaElement>(null)
    useEffect(() => { body.current?.scrollTo({ top: body.current.scrollHeight, behavior: 'smooth' }) }, [log.length, typing])

    const send = async () => {
      const t = draft.trim()
      if (!t || typing) return
      const sent: RpMsg[] = [...log, { r: 'y', t }]
      const guestTurns = log.filter((m) => m.r === 'g').length
      setDraft('')
      set((d) => { d.rp.logs[sc.id] = sent })
      setTypingIn(sc.id)
      /* The AI guest when the server can play it; the scenario's script otherwise. */
      let reply: string | undefined = sc.next[guestTurns - 1]
      const started = Date.now()
      try {
        const res = await fetch('/api/onboarding/ai/guest', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scenario: sc.id, log: sent.filter((m) => m.r !== 's') }),
        })
        if (res.status === 200) {
          const body = await res.json() as { text?: string; end?: boolean }
          reply = body.end ? undefined : body.text
        }
      } catch { /* keep the script line */ }
      /* A beat of "typing", even when the reply is instant. */
      await new Promise((r) => setTimeout(r, Math.max(0, 700 - (Date.now() - started))))
      setTypingIn(null)
      set((d) => {
        const cur = d.rp.logs[sc.id] ?? sent
        if (reply) cur.push({ r: 'g', t: reply })
        else { cur.push({ r: 's', t: 'That’s the end of this scenario.' }); d.rp.done[sc.id] = true }
        d.rp.logs[sc.id] = cur
      })
      input.current?.focus()
    }
    const nextOpen = list.find((s, j) => j > k && !a.rp.done[s.id]) ?? list.find((s) => !a.rp.done[s.id])

    return (
      <>
        <Head eyebrow={P3} title="Calibrate Your Voice"
          why="We learn more from how you actually reply than from anything you could describe. A made-up guest will message you. Reply exactly the way you would in a DM or an email to a client." />
        <div className="callout" style={{ marginBottom: 22 }}>
          <b>Use made-up details only.</b> The guest is played by AI, so no two conversations are the same. Like your replies in Part 1, this is only about how you sound. Prices, times,
          and offers you mention here are never used as facts, so rough numbers are fine. Each scenario takes a minute or
          two, and you can come back anytime.
        </div>
        <div className="rp" data-need="rp">
          <div className="rplist" role="tablist" aria-label="Scenarios">
            {list.map((s, j) => (
              <button key={s.id} type="button" role="tab" aria-selected={s.id === sc.id}
                className={`rpi${s.id === sc.id ? ' on' : ''}${a.rp.done[s.id] ? ' done' : ''}`}
                onClick={() => set((d) => { d.rp.cur = s.id })}>
                <i aria-hidden="true">{a.rp.done[s.id] ? '✓' : j + 1}</i>{s.t}
                {a.rp.done[s.id] && <span className="sr-only">, finished</span>}
              </button>
            ))}
          </div>
          <div className="rpchat">
            <div className="rphead">
              <h3 style={{ margin: 0 }}>{sc.t}</h3>
              <span className="note" style={{ margin: 0 }}>Scenario {k + 1} of {list.length}</span>
            </div>
            <div className="rpbody" ref={body} aria-live="polite">
              {log.map((m, j) => <div key={j} className={`m ${m.r === 'g' ? 'g' : m.r === 'y' ? 'y' : 'sys'} swap`}>{m.t}</div>)}
              {typing && <div className="m sys">The guest is typing…</div>}
            </div>
            {done ? (
              <div style={{ padding: '16px 20px', borderTop: '1px solid var(--line)' }}>
                <Field label="Anything you’d normally add that you didn’t here? (optional)">
                  <Text area label="Anything you’d normally add" value={a.rp.adds[sc.id] ?? ''} onChange={(v) => set((d) => { d.rp.adds[sc.id] = v })} />
                </Field>
                <div className="row rp-done">
                  {nextOpen
                    ? <Btn small onClick={() => set((d) => { d.rp.cur = nextOpen.id })}>Next scenario</Btn>
                    : <Btn small onClick={() => go('signoff')}>Finish role-play</Btn>}
                  <Btn small variant="outline" onClick={() => set((d) => {
                    /* Reopen where it left off: drop the closing note. */
                    d.rp.logs[sc.id] = log.filter((m, j) => !(m.r === 's' && j === log.length - 1))
                    d.rp.done[sc.id] = false
                  })}>Keep going</Btn>
                  <button type="button" className="link" onClick={() => set((d) => {
                    delete d.rp.logs[sc.id]
                    d.rp.done[sc.id] = false
                  })}>Start over</button>
                </div>
              </div>
            ) : (
              <>
                <div className="rpin">
                  <textarea ref={input} className="in" value={draft} placeholder="Type your reply" aria-label="Your reply"
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }} />
                  <Btn onClick={send} disabled={typing || !draft.trim()}>Send</Btn>
                </div>
                <div style={{ padding: '0 20px 14px' }}>
                  <button type="button" className="link" onClick={() => set((d) => {
                    d.rp.done[sc.id] = true
                    d.rp.logs[sc.id] = [...log, { r: 's', t: 'You ended this scenario.' }]
                  })}>End this scenario</button>
                </div>
              </>
            )}
          </div>
        </div>
      </>
    )
  },
}

/* ---------- Playbook summary and sign-off ---------- */

/** Lines that touch comfort, recovery, or safety, for a closer look. */
export function clinicalLines(a: Answers, spa: Spa): [string, string][] {
  const flag = /(safe|normal|side effect|pregnan|bruis|swell|pain|hurt|numb|aftercare|downtime)/i
  const out: [string, string][] = []
  for (const [k, o] of Object.entries(OBJ)) {
    for (const v of a.obj[k] ?? []) {
      const f = o.o.find(([x]) => x === v)
      if (f && flag.test(f[2])) out.push([`${o.t} objection`, voice(a, spa, f[2])])
    }
  }
  const tone = toneReply(a, spa)
  if (flag.test(tone)) out.push(['Tone sample', tone])
  return out
}

function Sec({ title, go, edit, md, children }: { title: string; go?: ((id: string) => void) | undefined; edit?: string; md?: boolean; children: ReactNode }) {
  return (
    <section className="q" style={{ maxWidth: 1000 }}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
        <h2 style={{ margin: 0 }}>{title}{md && <span className="pill md-pill">Medical</span>}</h2>
        {edit && go && <button type="button" className="link" onClick={() => go(edit)}>Edit</button>}
      </div>
      {children}
    </section>
  )
}
function Rows({ rows }: { rows: [string, string][] }) {
  return <dl className="sum" style={{ maxWidth: 'none' }}>{rows.map(([k, v], i) => <div key={`${i}${k}`}><dt>{k}</dt><dd>{v}</dd><span /></div>)}</dl>
}
function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  if (!rows.length) return <p className="note">None added.</p>
  return (
    <div className="tscroll">
      <table className="svc">
        <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} data-l={head[j]}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
}

const label = <T extends string>(opts: [T, string][], v: string) => opts.find(([x]) => x === v)?.[1] ?? ''

/**
 * The medical sections (D74): handoffs and urgent lines from the Protocol,
 * concerns from the Playbook. `part` picks one group; without it, all three.
 */
export function MedicalSections({ a, spa, go, part, tag = true }: { a: Answers; spa: Spa; go?: ((id: string) => void) | undefined; part?: 'protocol' | 'playbook'; tag?: boolean }) {
  const V = (s: string) => voice(a, spa, s)
  return (
    <>
      {part !== 'playbook' && (
        <>
      <Sec title="Front desk handoffs" edit="handoffs" go={go} md={tag}><Rows rows={[
        ['Response time', spa.commitment], ...Object.entries(HANDOFF).map(([k, h]): [string, string] => [h.t, handoffText(a, spa, k)]),
      ]} /></Sec>
      <Sec title="Urgent and emergency lines" edit="emergency" go={go} md={tag}><Rows rows={[
        ['Call 911', a.em.t1.join(', ')], ['911 script', V(a.em.s1)], ['Call our urgent line', a.em.t2.join(', ')], ['Urgent line script', V(a.em.s2)],
        ['Urgent line', `${a.em.urgent || 'Not set'}${a.em.hours ? `, ${a.em.hours}` : ''}`],
        ...(a.em.after.trim() ? [['After hours', a.em.after] as [string, string]] : []),
      ]} /></Sec>
        </>
      )}
      {part !== 'protocol' && (
      <Sec title="Concerns" edit="concerns" go={go} md={tag}>
        <Table head={['Concern', 'Recommends', 'If none fit']} rows={[
          ['Pregnancy and nursing', a.preg.svc.join(', ') || 'None', a.preg.fb === 'frontdesk' ? 'The front desk' : 'A consult'],
          ...a.concerns.map((c) => [c.n, c.svc.join(', then ') || 'None', c.fb === 'frontdesk' ? 'The front desk' : 'A consult']),
        ]} />
      </Sec>
      )}
    </>
  )
}

/** The whole playbook, read-only. With `go`, each section links back to its screen. */
export function Playbook({ a, spa, go }: { a: Answers; spa: Spa; go?: ((id: string) => void) | undefined }) {
  const t = terms(a)
  const tone = TONES.find((x) => x.v === a.tone)?.t ?? (a.tone === 'warm-bal' ? 'Between warm and balanced' : 'Between balanced and polished')
  const look = a.avType === 'portrait' ? `Realistic portrait ${a.avId + 1}` : a.avType === 'logo' ? 'Your logo' : `Icon: ${ICONS[a.avId]?.[1] ?? ''}`
  const signoff = a.signoff === -1 ? 'None' : a.signoff === -2 ? a.signoffCustom.trim() || 'Your own' : voice(a, spa, SIGNOFFS[a.signoff] ?? '')
  const tac = (k: string) => label(TACTICS[k]!.o, (a.tac as Record<string, string>)[k] ?? '')
  const hes = a.promos.find((p) => p.id === a.tac.hesitate)
  return (
    <>
      <p className="eyebrow" style={{ marginTop: 8 }}>Personality Protocol</p>
      <Sec title="Your treatment coordinator" edit="name" go={go}><Rows rows={[
        ['Name', coordName(a) || 'Not chosen yet'], ['Subtitle', a.nameStyle === 'generic' ? spa.name : a.subtitle], ['Look', look],
        ['Feeling words', a.feel.join(', ') || 'None'], ['Names to avoid', a.avoid || 'None'],
      ]} /></Sec>
      <Sec title="Voice" edit="tone" go={go}><Rows rows={[
        ['Tone', tone], ['Emojis', a.emoji === 'never' ? 'Never' : 'Occasionally'],
        ['Exclamation points', { yes: 'Yes', sparingly: 'Sparingly', never: 'Never' }[a.exclaim]],
        ['Reply length', a.length === 'short' ? 'Short and quick' : 'A bit more detail'], ['Sample reply', toneReply(a, spa)],
      ]} /></Sec>
      <Sec title="Words" edit="words" go={go}><Rows rows={[
        ['People you serve', t.guests], ['What you offer', t.treatments], ['Who performs them', t.providers], ['Booking phrase', t.book],
        ['Brand names', { brand: 'Use brand names', category: 'Use category terms', either: 'Either is fine' }[a.brandNames]],
        ['Greeting', greetingText(a, spa)], ['Sign-off', signoff],
      ]} /></Sec>
      <Sec title="Languages and pricing" edit="languages" go={go}><Rows rows={[
        ['Languages', a.languages.join(', ') + (a.languages.length > 1 ? (a.langMode === 'match' ? ' (replies in the guest’s language)' : ' (offers a choice at the start)') : '')],
        ['Default pricing', PRICING.find((p) => p.v === a.pricing)?.t ?? ''],
      ]} /></Sec>
      <Sec title="Never-say rules" edit="never" go={go}>
        <Rows rows={[...NEVER.filter((_, i) => a.never[i] !== false), ...a.neverCustom].map((r, i): [string, string] => [String(i + 1), r])} />
      </Sec>
      <Sec title="How you talk" edit="talk" go={go}><Rows rows={[
        ['Which sounds like you', `${Object.keys(a.pairs).length} choices`], ['Pasted replies', a.pasted.trim() ? 'Included' : 'None'],
      ]} /></Sec>
      <MedicalSections a={a} spa={spa} go={go} part="protocol" />



      <p className="eyebrow" style={{ marginTop: 20 }}>Sales Playbook</p>
      <Sec title="Services" edit="services" go={go}>
        <Table head={['Service', 'Category', 'Priority', 'Pairings', 'Add-ons', 'Consult', 'Price display']}
          rows={a.services.map((x) => [x.n, x.cat, label(PRIORITY, x.pr) + (x.pr === 'high' && x.why ? ` (${x.why})` : ''), x.pair.join(', '), x.add, x.consult ? 'Yes' : 'No', label(PRICE_OVR, x.price)])} />
      </Sec>
      <MedicalSections a={a} spa={spa} go={go} part="playbook" />

      <Sec title="Products" edit="products" go={go}>
        <Table head={['Product', 'Category', 'Priority', 'Recommend after', 'Helps with', 'Where to buy']}
          rows={a.products.map((p) => [productLabel(p), p.cat, label(PRIORITY, p.pr) + (p.pr === 'high' && p.why ? ` (${p.why})` : ''), p.after.join(', '), p.helps.join(', '),
            { both: 'In spa and online', instore: 'In spa only', online: 'Online only' }[p.where]])} />
      </Sec>
      <Sec title="Growth priorities" edit="growth" go={go}><Rows rows={[
        ...Object.entries(a.growth.pk),
        ['What sets you apart', [a.growth.diffs.join(', '), a.growth.spec.trim()].filter(Boolean).join('. ') || 'None'],
      ]} /></Sec>
      <Sec title="Promotions" edit="promos" go={go}>
        <Table head={['Promotion', 'Type', 'Terms', 'Applies to', 'When', 'Event']} rows={a.promos.map((p) => [
          p.n, { current: 'Running now', evergreen: 'Evergreen', upcoming: 'Upcoming', yearly: 'Every year' }[p.type], p.terms, p.apply.join(', '),
          p.type === 'evergreen' ? evergreenWhen(p)
            : p.type === 'yearly' ? `Every year, ${MONTHS[p.sm - 1]} to ${MONTHS[p.em - 1]}` : [fmtDate(p.start), fmtDate(p.end)].filter(Boolean).join(' to '),
          a.events.find((e) => e.id === p.ev)?.n ?? '',
        ])} />
      </Sec>
      <Sec title="Events" edit="promos" go={go}>
        <Table head={['Event', 'When', 'Who it’s for', 'RSVP']} rows={a.events.filter((e) => e.n.trim()).map((e) => [
          e.n, evWhen(e), { public: 'Open to everyone', members: 'Members only', invite: 'Invite only' }[e.who],
          { card: 'Card in the chat', link: 'Link', none: 'Not needed' }[e.rsvp],
        ])} />
      </Sec>
      <Sec title="Objections" edit="objections" go={go}><Rows rows={Object.entries(OBJ).map(([k, o]): [string, string] => [
        o.t, (a.obj[k] ?? []).map((v) => o.o.find(([x]) => x === v)?.[1]).filter(Boolean).join(', then ') || 'Not set',
      ])} /></Sec>
      <Sec title="Sales tactics" edit="tactics" go={go}><Rows rows={[
        ['Promotions', tac('discount') + (a.tac.discount === 'hesitate' && hes ? `: ${hes.n}` : '')],
        ['Booking or callback offer', tac('offer')], ['Suggesting booking', tac('push')], ['Urgency', tac('urgency')],
      ]} /></Sec>
      {(a.notes1.trim() || a.notes2.trim()) && (
        <Sec title="Your comments for H1" edit={a.notes1.trim() ? 'sum1' : 'sum2'} go={go}><Rows rows={[
          ...(a.notes1.trim() ? [['Personality Protocol', a.notes1.trim()] as [string, string]] : []),
          ...(a.notes2.trim() ? [['Sales Playbook', a.notes2.trim()] as [string, string]] : []),
        ]} /></Sec>
      )}

      <p className="eyebrow" style={{ marginTop: 20 }}>Voice Calibration</p>
      <Sec title="Role-play" edit="roleplay" go={go}><Rows rows={[
        ['Scenarios finished', `${scenarios(a).filter((s) => a.rp.done[s.id]).length} of ${scenarios(a).length}`],
      ]} /></Sec>
    </>
  )
}

const longDay = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

/** Signed now, and still covering the answers as they are. */
const signed = (a: Answers) => !!a.sign.signedAt && a.sign.hash === answersHash(a)

const signoff: Screen = {
  id: 'signoff', part: 2, title: 'Playbook summary and sign-off', wide: true,
  done: signed,
  needs: (a) => needList(
    !a.sign.name.trim() && { msg: 'Enter your name', at: 'signer' },
    !a.sign.title.trim() && { msg: 'Enter your title', at: 'signer' },
    !a.sign.attest && { msg: 'Check the box to confirm', at: 'attest' },
    !signed(a) && { msg: a.sign.signedAt ? 'Sign off again, since answers changed' : 'Sign off and submit', at: 'sign' },
  ),
  Render: function SignOff({ a, spa, set, go, server, whenSaved, setApprovals }) {
    const [busy, setBusy] = useState(false)
    const [err, setErr] = useState('')
    const sign = async () => {
      setErr('')
      const mark = () => set((d) => { d.sign.signedAt = new Date().toISOString(); d.sign.hash = answersHash(d) })
      if (!server) { mark(); return }
      setBusy(true)
      try {
        await whenSaved()
        const res = await fetch('/api/onboarding/sign', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: a.sign.name, title: a.sign.title, attest: a.sign.attest }),
        })
        if (!res.ok) throw new Error(String(res.status))
        setApprovals((await res.json() as { approvals: ApprovalStatus[] }).approvals)
        mark()
      } catch {
        setErr('We couldn’t record your sign-off. Check your connection and try again.')
      } finally {
        setBusy(false)
      }
    }
    const cl = clinicalLines(a, spa)
    const isSigned = signed(a)
    const stale = !!a.sign.signedAt && !isSigned
    const missing = [!a.sign.name.trim() && 'your name', !a.sign.title.trim() && 'your title', !a.sign.attest && 'the tick to confirm'].filter(Boolean) as string[]
    const ready = !missing.length
    return (
      <>
        <Head eyebrow={P3} title="Playbook Summary and Sign-Off"
          why="Your complete Personality Protocol and Sales Playbook in one place. Look it over, then sign off so we can build." />
        {cl.length > 0 && (
          <div className="callout warn-callout" style={{ marginBottom: 34, maxWidth: 1000 }}>
            <h3 style={{ margin: '0 0 8px' }}>Worth a closer look</h3>
            <p style={{ margin: '0 0 10px' }}>These lines touch on comfort, recovery, or safety. Confirm each is accurate for your practice.</p>
            {cl.map(([k, x]) => <p key={k + x} style={{ margin: '6px 0 0' }}><b>{k}:</b> {x}</p>)}
          </div>
        )}
        <Playbook a={a} spa={spa} go={go} />

        <Sec title="Sign-off" go={go}>
          <div className="panel" style={{ marginBottom: 14, maxWidth: 780 }} data-need="signer">
            <div className="grid2">
              <Field label="Your name"><Text label="Your name" value={a.sign.name} placeholder="Full name" onChange={(v) => set((d) => { d.sign.name = v })} /></Field>
              <Field label="Your title"><Text label="Your title" value={a.sign.title} placeholder="Owner, Medical Director" onChange={(v) => set((d) => { d.sign.title = v })} /></Field>
            </div>
          </div>
          <div data-need="attest" style={{ maxWidth: 780 }}>
            <Check className="check panel" checked={a.sign.attest} onChange={(v) => set((d) => { d.sign.attest = v })}>
              I’ve reviewed everything above, including the medical and safety sections, and I’m authorized to approve it
              for {spa.name}. I understand that no AI solution built from this gives medical or clinical advice.
            </Check>
          </div>

          <div data-need="sign" style={{ marginTop: 18 }}>
            {isSigned && <div className="locked">Signed off by {a.sign.name} on {longDay(a.sign.signedAt)}.</div>}
            {stale && <div className="warn" style={{ maxWidth: 780, marginBottom: 14 }}>You’ve changed answers since signing off on {longDay(a.sign.signedAt)}. Sign off again so it covers the latest version.</div>}
            {!isSigned && (
              <div className="row">
                <Btn disabled={!ready || busy} aria-busy={busy} onClick={() => void sign()}>
                  {busy ? 'Submitting…' : stale ? 'Sign off again and submit' : 'Sign off and submit'}
                </Btn>
                {!ready && <span className="note" style={{ margin: 0 }}>To submit, add {missing.length > 1 ? `${missing.slice(0, -1).join(', ')} and ${missing.at(-1)}` : missing[0]}.</span>}
                {ready && !server && <span className="note" style={{ margin: 0 }}>This is a demo, so nothing is recorded.</span>}
              </div>
            )}
            {err && <p className="warn" style={{ maxWidth: 780 }} role="alert">{err}</p>}
          </div>
        </Sec>
      </>
    )
  },
}

/* ---------- Done ---------- */

const done: Screen = {
  id: 'done', part: 2, title: 'You’re done', wide: true,
  done: signed,
  Render: ({ a, go }) => {
    const isSigned = signed(a)
    return (
      <>
        <Head eyebrow="All set" title={isSigned ? 'Your Protocol and Playbook Are Approved' : 'Almost There'}
          why={isSigned
            ? `Signed off by ${a.sign.name} on ${longDay(a.sign.signedAt)}. Here’s what happens next.`
            : a.sign.signedAt
              ? 'You’ve changed answers since signing off. Sign off again so it covers the latest version.'
              : 'Your answers are saved. Signing off is the last step.'} />
        <div className="hero-parts" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', maxWidth: 1100 }}>
          {[
            ['Design meeting with H1', 'We review your Personality Protocol and Sales Playbook with you, fill in anything missing, and answer your questions before the build.'],
            ['We build your AI Treatment Coordinator', 'H1 turns your answers into your coordinator’s voice, sales logic, and guardrails.'],
            ['Together, we test it thoroughly', 'We send you the exact chat that will go on your website so you can try it yourself, and we make any edits you’d like.'],
            ['Go live, then keep improving', 'Your coordinator goes live on your website. We review how it’s doing every month and keep tuning it.'],
          ].map(([h, p], i) => (
            <div key={h} className="hp"><div className="num">{i + 1}</div><h3 style={{ margin: 0 }}>{h}</h3><p>{p}</p></div>
          ))}
        </div>
        {!isSigned && <Btn onClick={() => go('signoff')}>Go to sign-off</Btn>}
      </>
    )
  },
}

export const PART3: Screen[] = [roleplay, signoff, done]
