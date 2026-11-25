'use client'
/*
 * Part 1, continued: words, languages, pricing, the never-say list, how the
 * team talks, handoffs, urgent lines, and the summary. Wording follows the
 * prototype, with the changes in 09-intake-wizard.md §4: English and Spanish
 * only (D47), prices from the spa's own list (D72), the voice flow in §4.2
 * (D73), and sign-off at the end (D74).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { FAST, GREETINGS, HANDOFF, LANGS, NEVER, PAIRS, PRICING, SIGNOFFS, TERMS, TONES } from '../content'
import { shown, type Terms, unpicked } from '../answers'
import { needList, type Screen } from './types'
import { P1 } from './part1'
import { Redactor } from '../Redactor'
import { Btn, Cards, Check, ChipEdit, ChipToggle, Field, Head, Q, Radios, Reveal, Seg, Summary, Text } from '../ui'
import { coordName, genericConvo, greetingText, handoffText, pricingLine, terms, voice } from '../voice'

const words: Screen = {
  id: 'words', part: 0, title: 'Your words',
  done: (a) => !!a.visited.words,
  needs: (a) => needList(
    ...(['guests', 'treatments', 'providers', 'book'] as const).filter((k) => a.terms[k] === '__other' && !a.termsOther[k].trim())
      .map((k) => ({ msg: `Type your own word for ${({ guests: 'the people you serve', treatments: 'what you offer', providers: 'who performs them', book: 'your booking phrase' })[k]}`, at: `term-${k}` })),
    a.greeting === -1 && !a.greetingCustom.trim() && { msg: 'Write your greeting', at: 'greeting' },
    a.greeting === -1 && !!a.greetingCustom.trim() && !/\bAI\b/.test(a.greetingCustom) && { msg: 'Say it’s AI in your greeting', at: 'greeting' },
    a.signoff === -2 && !a.signoffCustom.trim() && { msg: 'Write your sign-off', at: 'signoff' },
  ).concat(unpicked(a, 'words')),
  preview: genericConvo,
  Render: ({ a, spa, set }) => {
    const term = (k: keyof Terms, title: string) => (
      <Q need={`term-${k}`} title={title}>
        <Radios name={k} opts={[...TERMS[k]!, ['__other', 'Other']]} value={shown(a, `terms.${k}`, a.terms[k])} onPick={(v) => set((d) => { d.terms[k] = v; d.picked[`terms.${k}`] = true })} />
        <Reveal open={shown(a, `terms.${k}`, a.terms[k]) === '__other'}>
          <div style={{ marginTop: 10, maxWidth: 420 }}>
            <Field label="Your own word"><Text label={`Your word for ${title.toLowerCase()}`} value={a.termsOther[k]} placeholder="Type your own" onChange={(v) => set((d) => { d.termsOther[k] = v })} /></Field>
          </div>
        </Reveal>
      </Q>
    )
    return (
      <>
        <Head eyebrow={P1} title="Your Words" why="These small phrases repeat in every conversation, so they’re worth getting exactly right." />
        {term('guests', 'What do you call the people you serve?')}
        {term('treatments', 'What do you call what you offer?')}
        {term('providers', 'What do you call the people who perform them?')}
        {term('book', 'What’s your booking phrase?')}
        <Q need="brandNames" title="Brand names" hint="Is it okay to say “Botox” and “Juvederm,” or should your coordinator use category terms like “neurotoxin” and “filler”?">
          <Radios name="brandNames" opts={[['brand', 'Use brand names'], ['category', 'Use category terms'], ['either', 'Either is fine']]} value={shown(a, 'brandNames', a.brandNames)}
            onPick={(v) => set((d) => { d.brandNames = v as typeof d.brandNames; d.picked.brandNames = true })} />
        </Q>
        <Q need="greeting" title="Greeting" hint="The first thing every visitor sees when they visit your website, including how your coordinator introduces itself. Introductions from paid ads will be based on the ad copy and may be different.">
          <Cards value={shown(a, 'greeting', a.greeting)} onPick={(v) => set((d) => { d.greeting = v; d.picked.greeting = true })}
            opts={[...GREETINGS.map((_, i) => ({ v: i, t: greetingText({ ...a, greeting: i }, spa) })),
              { v: -1, t: 'Write my own', d: 'The chat window always shows an AI disclaimer, and your greeting must still say it’s AI.' }]} />
          <Reveal open={shown(a, 'greeting', a.greeting) === -1}>
            <div style={{ marginTop: 12 }}>
              <Field label="Your greeting" note="Include that it’s AI, like “I’m Sophie, your AI Treatment Coordinator.”">
                <Text area label="Your greeting" value={a.greetingCustom} placeholder={`Hi, welcome to ${spa.short}. I’m Sophie, ${spa.short}’s AI Treatment Coordinator. What brings you in?`}
                  onChange={(v) => set((d) => { d.greetingCustom = v })} />
              </Field>
            </div>
            {a.greetingCustom.trim() && !/\bAI\b/.test(a.greetingCustom) && <p className="warn">Your greeting needs to say it’s AI, like “I’m Sophie, {spa.short}’s AI Treatment Coordinator.”</p>}
          </Reveal>
        </Q>
        <Q need="signoff" title="Sign-off">
          <Cards value={shown(a, 'signoff', a.signoff)} onPick={(v) => set((d) => { d.signoff = v; d.picked.signoff = true })}
            opts={[...SIGNOFFS.map((t, i) => ({ v: i, t: voice(a, spa, t) })), { v: -2, t: 'Other' }, { v: -1, t: 'No sign-off' }]} />
          <Reveal open={shown(a, 'signoff', a.signoff) === -2}>
            <div style={{ marginTop: 12, maxWidth: 560 }}>
              <Field label="Your sign-off"><Text label="Your sign-off" value={a.signoffCustom} placeholder="Type your own" onChange={(v) => set((d) => { d.signoffCustom = v })} /></Field>
            </div>
          </Reveal>
        </Q>
      </>
    )
  },
}

const languages: Screen = {
  id: 'languages', part: 0, title: 'Languages',
  done: (a) => a.languages.length > 0,
  needs: (a) => unpicked(a, 'languages'),
  preview: (a, spa) => {
    const offer = a.languages.includes('Spanish') && a.langMode === 'offer'
    const msgs = [{ r: 'bot' as const, t: greetingText(a, spa) + (offer ? ' También hablo español.' : '') }]
    return a.languages.includes('Spanish')
      ? [...msgs, { r: 'gst' as const, t: 'Hola, ¿hacen relleno de labios?' },
        { r: 'bot' as const, t: '¡Sí! El relleno de labios es uno de nuestros tratamientos más solicitados. ¿Le gustaría agendar una consulta?' + (a.langHandoff === 'no' ? ' Nota: nuestro equipo responde principalmente en inglés.' : '') }]
      : [...msgs, { r: 'gst' as const, t: 'Do you do lip filler?' }, { r: 'bot' as const, t: voice(a, spa, 'Yes{!} Lip filler is one of our most-requested {treatments}.') }]
  },
  Render: ({ a, set }) => (
    <>
      <Head eyebrow={P1} title="Languages" why="Your coordinator can chat in English and Spanish. Pick only the ones your team can follow up in." />
      <Q title="Which languages should your coordinator speak?">
        <ChipToggle list={LANGS} value={a.languages} onToggle={(v) => set((d) => {
          if (v === 'English') return /* always on */
          d.languages = d.languages.includes(v) ? d.languages.filter((l) => l !== v) : [...d.languages, v]
        })} />
        <p className="note">English is always on. Spanish switches on after your coordinator launches in English, once it has passed our Spanish testing.</p>
      </Q>
      <Reveal open={a.languages.includes('Spanish')}>
        <Q need="langMode" title="How should it choose?">
          <Cards value={shown(a, 'langMode', a.langMode)} onPick={(v) => set((d) => { d.langMode = v; d.picked.langMode = true })} opts={[
            { v: 'match', t: 'Reply in the guest’s language', d: 'If a guest writes in Spanish, it answers in Spanish.' },
            { v: 'offer', t: 'Offer a choice at the start', d: 'The greeting mentions it also speaks Spanish.' },
          ]} />
        </Q>
        <Q need="langHandoff" title="Can your team handle a handoff in Spanish?" hint="If not, your coordinator says so before handing off, so the guest isn’t surprised.">
          <Seg opts={[['yes', 'Yes'], ['no', 'Not always']]} value={shown(a, 'langHandoff', a.langHandoff)} onPick={(v) => set((d) => { d.langHandoff = v; d.picked.langHandoff = true })} />
        </Q>
      </Reveal>
    </>
  ),
}

const pricing: Screen = {
  id: 'pricing', part: 0, title: 'Pricing display',
  done: (a) => !!a.visited.pricing,
  needs: (a) => unpicked(a, 'pricing'),
  preview: (a, spa) => [{ r: 'bot', t: greetingText(a, spa) }, { r: 'gst', t: 'How much is lip filler?' }, { r: 'bot', t: pricingLine(a, spa) + ' ' + voice(a, spa, 'Would you like to {book}?') }],
  Render: ({ a, spa, set }) => (
    <>
      <Head eyebrow={P1} title="Pricing Display"
        why="Many spas avoid quoting injectable prices online so the conversation moves to a consult. Others win trust by being upfront. Set your default here."
        open={a.help.pricing} onHelp={() => set((d) => { d.help.pricing = !d.help.pricing })}
        help={<>If your prices are already on your website, quoting them in chat builds trust and filters out price shoppers. If they aren’t, “Never quote” keeps your pricing strategy consistent and drives consults. “Starting at” is a common middle ground. You can set a different rule for any single service in Part 2.</>} />
      <Q need="pricing" title="Default rule" hint="Each option shows how your coordinator would answer “How much is lip filler?”">
        <Cards value={shown(a, 'pricing', a.pricing)} onPick={(v) => set((d) => { d.pricing = v; d.picked.pricing = true })}
          opts={PRICING.map((p) => ({ v: p.v, t: p.t, eg: voice(a, spa, p.r) }))} />
      </Q>
      <p className="note">Prices come from the price list we keep for you, so they’re only as current as that list. You can set per-service exceptions in Part 2.</p>
    </>
  ),
}

const never: Screen = {
  id: 'never', part: 0, title: 'Never-say list',
  done: (a) => !!a.visited.never,
  preview: genericConvo,
  Render: ({ a, set }) => (
    <>
      <Head eyebrow={P1} title="Never-Say List" why="These are hard rules. Your coordinator will never say them, no matter how a guest asks. We’ve started you with the most important ones." />
      <Q title="Default rules" hint="Uncheck any that don’t apply to you.">
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {NEVER.map((n, i) => (
            <Check key={n} checked={a.never[i] !== false} onChange={(v) => set((d) => { d.never[i] = v })}>{n}</Check>
          ))}
        </div>
        <Reveal open={a.never[4] === false}>
          <div className="warn">You’ve allowed “cheap” and “discount.” Your discount rules in Part 2 still decide when offers can be mentioned.</div>
        </Reveal>
      </Q>
      <Q title="Add your own" hint="Words, phrases, or topics you never want used.">
        <ChipEdit list={a.neverCustom} placeholder="For example: We never say “botched”" onChange={(next) => set((d) => { d.neverCustom = next })} />
      </Q>
    </>
  ),
}

const pairs: Screen = {
  id: 'pairs', part: 0, title: 'Which sounds like you?',
  done: (a) => Object.keys(a.pairs).length === PAIRS.length,
  needs: (a) => {
    const left = PAIRS.length - Object.keys(a.pairs).length
    const first = PAIRS.findIndex((_, i) => !a.pairs[i])
    return left ? [{ msg: `Answer the last ${left === 1 ? 'one' : left}`, at: `pair-${first}` }] : []
  },
  preview: (a, spa) => {
    const last = Math.max(-1, ...Object.keys(a.pairs).map(Number))
    if (last < 0) return genericConvo(a, spa)
    const p = PAIRS[last]!
    return [{ r: 'gst', t: p.g }, { r: 'bot', t: a.pairs[last] === 'a' ? p.a : p.b }]
  },
  Render: ({ a, set }) => {
    const n = Object.keys(a.pairs).length
    return (
      <>
        <Head eyebrow={P1} title="Which Sounds Like You?"
          why="Ten quick choices. Each one shows the same reply written two ways. Tap the one that sounds more like your team. There’s no wrong answer, and nothing to type." />
        {PAIRS.map((p, i) => (
          <Q key={p.g} need={`pair-${i}`} title={`${i + 1}. A guest says: “${p.g}”`}>
            <div className="choices">
              {(['a', 'b'] as const).map((k) => (
                <button key={k} type="button" className={`choice${a.pairs[i] === k ? ' on' : ''}`} aria-pressed={a.pairs[i] === k}
                  onClick={() => set((d) => { d.pairs[i] = k })}>
                  <span className="bubble" style={{ marginTop: 0 }}>{k === 'a' ? p.a : p.b}</span>
                </button>
              ))}
            </div>
          </Q>
        ))}
        <p className="note">{n} of {PAIRS.length} answered.</p>
      </>
    )
  },
}

/** Whether the screenshot reader is switched on (api/onboarding/ai/shots). Off in the demo. */
function useShotsOn(server: boolean) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    if (!server) return
    let live = true
    fetch('/api/onboarding/ai/shots').then((r) => (r.ok ? r.json() : { on: false })).then((b: { on?: boolean }) => { if (live) setOn(!!b.on) }).catch(() => {})
    return () => { live = false }
  }, [server])
  return on
}

/** A screenshot as base64 JPEG, at most 1568px on its long side (what the model reads at full detail). */
async function shrink(url: string): Promise<string> {
  const img = new Image()
  img.src = url
  await img.decode()
  const k = Math.min(1, 1568 / Math.max(img.naturalWidth, img.naturalHeight))
  const c = document.createElement('canvas')
  c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k)
  const g = c.getContext('2d')!
  g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height)
  g.drawImage(img, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', 0.85).split(',')[1]!
}

/**
 * Screenshots live only in this component: shown as thumbnails, never saved.
 * Each new one opens in the black-out editor; saving replaces it with the
 * blacked-out copy. Reading sends each one to the server once; the replies
 * come back for the spa to review, and only the ones they keep are added to
 * their pasted replies. The screenshots are then cleared.
 */
function Screenshots({ onCount, allowed, onAdd }: { onCount: (n: number) => void; allowed: boolean; onAdd: (replies: string[]) => void }) {
  const [shots, setShots] = useState<{ url: string; name: string }[]>([])
  const [reading, setReading] = useState(false)
  const [found, setFound] = useState<{ t: string; keep: boolean }[] | null>(null)
  const [msg, setMsg] = useState('')
  /** Screenshots waiting for the editor, first one open. */
  const [queue, setQueue] = useState<string[]>([])
  const [batch, setBatch] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const urls = useRef<string[]>([])
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), [])
  useEffect(() => { onCount(shots.length) }, [shots.length, onCount])
  useEffect(() => () => onCount(0), [onCount])
  const track = (url: string) => { urls.current.push(url); return url }
  const add = (files: FileList | null) => {
    const next = [...(files ?? [])].filter((f) => f.type.startsWith('image/')).slice(0, 10 - shots.length)
      .map((f) => ({ url: track(URL.createObjectURL(f)), name: f.name }))
    setShots((s) => [...s, ...next])
    setQueue(next.map((n) => n.url))
    setBatch(next.length)
  }
  const clear = () => { shots.forEach((s) => URL.revokeObjectURL(s.url)); setShots([]) }
  const read = async () => {
    setReading(true); setMsg('')
    const out: string[] = []
    let failed = 0
    for (const s of shots) {
      try {
        const res = await fetch('/api/onboarding/ai/shots', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: await shrink(s.url) }) })
        if (res.status === 429) { setMsg('That’s the most screenshots we can read today. Try the rest tomorrow, or paste your replies below.'); break }
        if (!res.ok) { failed++; continue }
        out.push(...((await res.json()) as { replies: string[] }).replies)
      } catch { failed++ }
    }
    setReading(false)
    if (failed) setMsg(`We couldn’t read ${failed === shots.length ? 'your screenshots' : `${failed} of them`}. Try again, or paste your replies below.`)
    if (out.length) setFound(out.map((t) => ({ t, keep: true })))
    else if (!failed) setMsg('We didn’t find any of your team’s replies in these. Try screenshots that show your side of the conversation.')
  }
  const keep = () => {
    onAdd(found!.filter((f) => f.keep && f.t.trim()).map((f) => f.t.trim()))
    setFound(null); clear()
    setMsg('Added to your replies below. Your screenshots are cleared.')
  }
  const editing = queue[0]
  const advance = () => setQueue((q) => q.slice(1))
  const replace = (old: string, url: string) => {
    track(url)
    URL.revokeObjectURL(old)
    setShots((all) => all.map((x) => (x.url === old ? { ...x, url } : x)))
    advance()
  }
  return (
    <>
      <button type="button" className="drop" style={{ width: '100%' }} onClick={() => input.current?.click()}>
        <b>Choose screenshots</b><br /><span className="note">PNG or JPG, up to 10. You can black out anything private next.</span>
      </button>
      <input ref={input} type="file" accept="image/png,image/jpeg" multiple hidden onChange={(e) => { add(e.target.files); e.target.value = '' }} />
      {shots.length > 0 && (
        <div className="thumbs">
          {shots.map((s, i) => (
            <div key={s.url} className="thumb swap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.url} alt={`Screenshot ${i + 1}`} />
              <button type="button" className="thumb__x" aria-label={`Remove screenshot ${i + 1}`} onClick={() => { URL.revokeObjectURL(s.url); setShots((all) => all.filter((x) => x.url !== s.url)) }}>×</button>
              <button type="button" className="thumb__edit" onClick={() => { setQueue([s.url]); setBatch(1) }}>Black out</button>
            </div>
          ))}
        </div>
      )}
      {editing && (
        <Redactor key={editing} src={editing}
          label={batch > 1 ? `Screenshot ${batch - queue.length + 1} of ${batch}` : 'Screenshot'}
          onSave={(url) => replace(editing, url)} onClose={advance} />
      )}
      {shots.length > 0 && !found && (
        <div className="row" style={{ marginTop: 14 }}>
          <Btn disabled={!allowed || reading || !!editing} aria-busy={reading} onClick={() => void read()}>
            {reading ? 'Reading…' : `Read my screenshot${shots.length === 1 ? '' : 's'}`}
          </Btn>
          {!allowed && <span className="note" style={{ margin: 0 }}>Tick the box below first.</span>}
        </div>
      )}
      {found && (
        <div className="panel" style={{ marginTop: 14 }}>
          <h3 style={{ margin: '0 0 6px' }}>Your team’s replies we found</h3>
          <p className="note" style={{ margin: '0 0 12px' }}>Untick any you don’t want to keep. You can edit them after they’re added.</p>
          {found.map((f, i) => (
            <Check key={i} checked={f.keep} onChange={(v) => setFound((all) => all!.map((x, j) => (j === i ? { ...x, keep: v } : x)))}>{f.t}</Check>
          ))}
          <div className="row" style={{ marginTop: 12 }}>
            <Btn onClick={keep} disabled={!found.some((f) => f.keep)}>Add these to my replies</Btn>
            <button type="button" className="link" onClick={() => { setFound(null); setMsg('') }}>Discard</button>
          </div>
        </div>
      )}
      {msg && <p className="note" role="status">{msg}</p>}
    </>
  )
}

const talk: Screen = {
  id: 'talk', part: 0, title: 'Show us how you talk',
  done: (a) => !!a.visited.talk,
  needs: (a) => needList(
    a.shots > 0 && !a.attest && { msg: 'Tick the box to confirm you’ve removed client names and personal information, or remove the screenshots', at: 'attest' },
  ),
  preview: genericConvo,
  Render: function Talk({ a, set, server }) {
    const onShots = useCallback((n: number) => set((d) => { d.shots = n }), [set])
    const shotsOn = useShotsOn(server)
    const addReplies = (list: string[]) => set((d) => { d.pasted = [d.pasted.trim(), ...list].filter(Boolean).join('\n\n') })
    return (
    <>
      <Head eyebrow={P1} title="Show Us How You Talk"
        why="Your real replies to guests are the best guide to how your coordinator should sound. A few minutes here makes the biggest difference." />
      {shotsOn && (
        <Q title="Screenshots of real conversations (optional)" hint="Upload DMs or texts that went well, ideally ones that ended in a booking. Please black out client names and any personal or health information during the upload. We use them only to build your Personality Protocol, then delete them right away.">
          <Screenshots onCount={onShots} allowed={a.attest} onAdd={addReplies} />
          <div style={{ marginTop: 14 }} data-need="attest">
            <Check className="check panel" checked={a.attest} onChange={(v) => set((d) => { d.attest = v })}>
              I confirm I’ve removed all client names and personal information from these screenshots.
            </Check>
          </div>
        </Q>
      )}
      <Q title="Or paste replies you’ve written (optional)" hint="Emails or messages your team sent. Paste only your side, never the client’s.">
        <Text area label="Your team’s replies" value={a.pasted} placeholder="Paste your replies here" onChange={(v) => set((d) => { d.pasted = v })} />
      </Q>
    </>
    )
  },
}

const handoffs: Screen = {
  id: 'handoffs', part: 0, title: 'Front desk handoffs',
  done: (a) => !!a.visited.handoffs,
  needs: (a, spa) => unpicked(a, 'handoffs').concat(Object.entries(HANDOFF).flatMap(([k, h]) => {
    if (!a.picked[`handoff.${k}`] || a.handoff[k] !== -1) return []
    const custom = (a.handoffCustom[k] ?? '').trim()
    const at = `handoff-${k}`
    return !custom ? [{ msg: `Write your wording for “${h.t}”`, at }]
      : FAST.test(custom) ? [{ msg: `Change “${h.t}” so it doesn’t promise faster than ${spa.commitment}`, at }] : []
  })),
  preview: (a, spa) => [
    { r: 'gst', t: HANDOFF.cant!.g }, { r: 'bot', t: handoffText(a, spa, 'cant') },
    { r: 'meta', t: 'The guest fills in a contact card' },
    { r: 'bot', t: voice(a, spa, 'Thanks{!} Someone from our team will reach out within {C}.') },
    { r: 'meta', t: 'Medical question' }, { r: 'gst', t: HANDOFF.medical!.g }, { r: 'bot', t: handoffText(a, spa, 'medical') },
    { r: 'meta', t: 'Complaint' }, { r: 'gst', t: HANDOFF.complaint!.g }, { r: 'bot', t: handoffText(a, spa, 'complaint') },
  ],
  Render: ({ a, spa, set }) => (
    <>
      <Head eyebrow={P1} title="Front Desk Handoffs" why="When your coordinator can’t help, the handoff should feel seamless, not like a dead end." />
      <div className="callout" style={{ marginBottom: 28 }}>
        Your response-time commitment: <b>{spa.commitment}</b>. Every option below matches it. Guests share their
        contact details and your coordinator confirms: “Thanks! Someone from our team will reach out within {spa.commitment}.”
      </div>
      {Object.entries(HANDOFF).map(([k, h]) => {
        const custom = a.handoffCustom[k] ?? ''
        return (
          <Q key={k} need={`handoff-${k}`} title={h.t} hint={`A guest says: “${h.g}”`}>
            <Cards value={shown(a, `handoff.${k}`, a.handoff[k] ?? 0)} onPick={(v) => set((d) => { d.handoff[k] = v; d.picked[`handoff.${k}`] = true })}
              opts={[...h.o.map((t, i) => ({ v: i, t: voice(a, spa, t) })), { v: -1, t: 'Write my own' }]} />
            <Reveal open={a.handoff[k] === -1}>
              <div style={{ marginTop: 12 }}>
                <Field label="Your wording" note={`What your coordinator says for ${h.t.toLowerCase()}.`}>
                  <Text area label={`Your wording for ${h.t.toLowerCase()}`} value={custom} placeholder="Write your wording" onChange={(v) => set((d) => { d.handoffCustom[k] = v })} />
                </Field>
              </div>
              {FAST.test(custom) && <div className="danger">This promises a faster response than your {spa.commitment} commitment. Change the wording, or tell us to update your commitment.</div>}
            </Reveal>
          </Q>
        )
      })}
    </>
  ),
}

const emergency: Screen = {
  id: 'emergency', part: 0, title: 'Urgent and emergency lines',
  done: (a) => !!a.visited.emergency && !!(a.em.urgent.trim()),
  needs: (a) => needList(
    !a.em.t1.length && { msg: 'Add at least one Tier 1 symptom', at: 't1' },
    !a.em.s1.trim() && { msg: 'Write the Tier 1 script', at: 's1' },
    !a.em.t2.length && { msg: 'Add at least one Tier 2 symptom', at: 't2' },
    !a.em.urgent.trim() && { msg: 'Enter your urgent line number', at: 'urgent' },
    !a.em.hours.trim() && { msg: 'Enter your urgent line’s hours', at: 'hours' },
    !!a.em.hours.trim() && !/24\s*\/\s*7/.test(a.em.hours) && !a.em.after.trim() && { msg: 'Say what to tell guests after hours', at: 'after' },
    !a.em.s2.trim() && { msg: 'Write the Tier 2 script', at: 's2' },
  ),
  preview: (a, spa) => [
    { r: 'gst', t: 'I had filler yesterday and the skin near my lip looks white and really hurts.' }, { r: 'alert', t: voice(a, spa, a.em.s2) },
    { r: 'meta', t: 'Tier 1 example' },
    { r: 'gst', t: 'My throat feels tight after my treatment.' }, { r: 'alert', t: voice(a, spa, a.em.s1) },
  ],
  Render: ({ a, spa, set }) => (
    <>
      <Head eyebrow={P1} title="Urgent and Emergency Lines"
        why="This overrides everything else, including sales, lead capture, and language settings. Your coordinator never diagnoses. It matches what a guest describes to a tier and gives your approved script." />
      <div className="callout" style={{ marginBottom: 28 }}>
        <b>This is a medical section.</b> Fill it in as best you can, and have your medical director check the
        symptom lists and scripts before you sign off at the end.
      </div>
      <Q title="Tier 1: Call 911 now" hint="Life-threatening symptoms.">
        <div data-need="t1"><Field label="Symptoms" note="We started you with common ones. Remove any, or add your own."><ChipEdit list={a.em.t1} placeholder="Add a symptom" onChange={(next) => set((d) => { d.em.t1 = next })} /></Field></div>
        <div style={{ marginTop: 14 }}><Field need="s1" label="Script" note="{urgent} is replaced with your urgent line number."><Text area value={a.em.s1} onChange={(v) => set((d) => { d.em.s1 = v })} /></Field></div>
      </Q>
      <Q title="Tier 2: Call our urgent line now" hint="Concerning, but not an emergency.">
        <div data-need="t2"><Field label="Symptoms" note="We started you with common ones. Remove any, or add your own."><ChipEdit list={a.em.t2} placeholder="Add a symptom" onChange={(next) => set((d) => { d.em.t2 = next })} /></Field></div>
        <div className="grid2" style={{ marginTop: 14 }}>
          <Field need="urgent" label="Urgent line number"><Text value={a.em.urgent} placeholder="(555) 555-0100" onChange={(v) => set((d) => { d.em.urgent = v })} /></Field>
          <Field need="hours" label="Hours"><Text value={a.em.hours} placeholder="24/7" onChange={(v) => set((d) => { d.em.hours = v })} /></Field>
        </div>
        <Reveal open={!!a.em.hours.trim() && !/24\s*\/\s*7/.test(a.em.hours)}>
          <Field need="after" label="What to say after hours">
            <Text area value={a.em.after} placeholder="After hours, call 911 for anything severe, or leave a message and our on-call provider will call you back." onChange={(v) => set((d) => { d.em.after = v })} />
          </Field>
        </Reveal>
        <Field need="s2" label="Script" note="{urgent} is replaced with your urgent line number."><Text area value={a.em.s2} onChange={(v) => set((d) => { d.em.s2 = v })} /></Field>
      </Q>
      <Q title="Tier 3: Routine concern" hint="Anything else goes to your front desk using the wording from the previous screen.">
        <div className="bubble" style={{ maxWidth: 560 }}>{handoffText(a, spa, 'cant')}</div>
      </Q>
    </>
  ),
}

const sum1: Screen = {
  id: 'sum1', part: 0, title: 'Part 1 summary',
  done: (a) => !!a.visited.sum1,
  preview: genericConvo,
  Render: ({ a, spa, go, set }) => {
    const t = terms(a)
    const tone = TONES.find((x) => x.v === a.tone)?.t ?? (a.tone === 'warm-bal' ? 'Between warm and balanced' : 'Between balanced and polished')
    const samples = Object.values(a.quick).filter((x) => x.trim()).length
    return (
      <>
        <Head eyebrow={P1} title="Part 1 Summary" why="Here’s your Personality Protocol so far. The preview shows your AI Treatment Coordinator using everything you chose." />
        <Summary go={go} rows={[
          ['Name', coordName(a) || 'Not chosen yet', 'name'],
          ['Look', { portrait: 'Realistic portrait', logo: 'Your logo', icon: 'Simple icon' }[a.avType], 'name'],
          ['Tone', `${tone}, emojis ${a.emoji}, exclamation points ${a.exclaim}`, 'tone'],
          ['Words', `${t.guests}, ${t.treatments}, ${t.providers}, “${t.book}”`, 'words'],
          ['Languages', a.languages.join(' and '), 'languages'],
          ['Pricing', PRICING.find((p) => p.v === a.pricing)?.t ?? '', 'pricing'],
          ['Never-say rules', `${NEVER.filter((_, i) => a.never[i] !== false).length + a.neverCustom.length} rules`, 'never'],
          ['Voice', `${Object.keys(a.pairs).length} of ${PAIRS.length} choices, ${samples} written replies`, 'pairs'],
          ['Handoffs', `Matched to ${spa.commitment}`, 'handoffs'],
          ['Urgent lines', 'Have your medical director check these', 'emergency'],
        ]} />
        <Field label="Do you have any additional comments or thoughts regarding your personality protocol?" note="Optional. Only H1 reads this; your coordinator never sees it.">
          <Text area id="notes1" value={a.notes1} onChange={(v) => set((d) => { d.notes1 = v })} />
        </Field>
      </>
    )
  },
}

export const PART1B: Screen[] = [words, languages, pricing, never, pairs, talk, handoffs, emergency, sum1]
