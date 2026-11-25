'use client'
/*
 * Part 1, the Personality Protocol: how the coordinator sounds. Screens and
 * wording follow the prototype, with the changes in 09-intake-wizard.md §4
 * (no invitations or roles, D83; portraits allowed with an AI label, D45).
 */
import { useState } from 'react'
import { FALLBACK_NAMES, FEEL, ICONS, NAME_STYLES, PORTRAITS, TONES } from '../content'
import { Avatar } from '../Avatar'
import { type AvatarType, shown, unpicked } from '../answers'
import { needList, type Screen } from './types'
import { Btn, Cards, ChipToggle, Field, Head, Q, Reveal, Seg, Text } from '../ui'
import { fillShort, genericConvo, greetingText, toneReply } from '../voice'

export const P1 = 'Part 1 of 3: Personality Protocol'

const welcome: Screen = {
  id: 'welcome', part: 0, title: 'Welcome',
  done: (a) => !!a.visited.welcome,
  preview: (a, spa) => [{ r: 'bot', t: greetingText(a, spa) }],
  Render: ({ spa, next }) => (
    <>
      <p className="eyebrow">For {spa.name}</p>
      <h1>Let’s Design Your <span className="accent-serif">Personality Protocol and Sales Playbook</span></h1>
      <p className="why">
        Your Personality Protocol is how your AI sounds. Your Sales Playbook is how it guides guests to book.
        Together, they shape how the AI Treatment Coordinator talks with your guests, so it sounds like your best
        front-desk person from day one.
      </p>
      <div className="callout" style={{ marginBottom: 30 }}>
        See your AI Treatment Coordinator come to life on the right side as you design it.
      </div>
      <div className="hero-parts">
        <div className="hp"><div className="num">1</div><h3>Personality Protocol</h3><p>Voice, words, and safety lines, plus your coordinator’s name and look.</p><em>About 20 minutes</em></div>
        <div className="hp"><div className="num">2</div><h3>Sales Playbook</h3><p>What to recommend, pair, and promote, and how to handle hesitation.</p><em>About 30 minutes</em></div>
        <div className="hp"><div className="num">3</div><h3>Voice Calibration</h3><p>A short text role-play, then your sign-off.</p><em>About 30 minutes</em></div>
      </div>
      <Q title="Getting help from your team"
        hint="Everything saves as you go, so you can stop and come back anytime from the private link we sent to you via email. If a manager or front desk lead can help, forward them the same link.">
        <div className="callout">
          <b>You sign off at the end.</b> You’ll see the whole playbook in one place first, with the medical sections
          marked, like urgent symptoms and medical questions. If you’re not the medical director, have them look
          those over before you sign.
        </div>
      </Q>
      <div className="row"><button type="button" className="link" onClick={next}>Skip ahead</button></div>
    </>
  ),
}

const LOOK_TABS: [AvatarType, string][] = [['portrait', 'Realistic portrait'], ['logo', 'Your logo'], ['icon', 'Simple icon']]
const LOOK_NOTES: Record<AvatarType, string> = {
  portrait: 'Lifelike AI-generated portraits, never a photo of a real staff member. The “AI” label appears next to the face everywhere it shows, and the first message says it’s AI, so guests aren’t misled.',
  logo: 'Uses the logo mark from your onboarding form.',
  icon: 'A simple mark in your brand colors. The most neutral option.',
}

const name: Screen = {
  id: 'name', part: 0, title: 'Design Your AI Treatment Coordinator',
  done: (a) => !!a.name.trim(),
  needs: (a) => needList(
    !a.feel.length && { msg: 'Pick at least one word for how a guest should feel', at: 'feel' },
    !a.name.trim() && { msg: 'Choose a name, or keep it generic', at: 'name' },
    a.nameStyle !== 'generic' && !/\bAI\b/.test(a.subtitle) && { msg: 'Add “AI” to the subtitle', at: 'subtitle' },
  ).concat(unpicked(a, 'name')),
  preview: genericConvo,
  Render: function Name({ a, spa, set }) {
    const [thinking, setThinking] = useState(false)
    /* AI ideas when the server can give them; the fixed list otherwise (and in the demo). */
    const showIdeas = async () => {
      const fallback = () => set((d) => {
        const avoid = d.avoid.toLowerCase()
        d.ideas = (FALLBACK_NAMES[d.nameStyle || 'first'] ?? []).map(([n, r]) => [fillShort(n, spa), fillShort(r, spa)] as [string, string])
          .filter(([n]) => !avoid || !avoid.includes(n.toLowerCase()))
      })
      setThinking(true)
      try {
        const res = await fetch('/api/onboarding/ai/names', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ feel: a.feel, style: a.nameStyle || 'first', avoid: a.avoid }),
        })
        if (res.status === 200) {
          const { ideas } = await res.json() as { ideas: [string, string][] }
          set((d) => { d.ideas = ideas })
        } else fallback()
      } catch { fallback() } finally { setThinking(false) }
    }
    const generic = a.nameStyle === 'generic'
    const suggestOpen = !!a.help.suggest
    const tiles: [number, string][] = a.avType === 'portrait' ? PORTRAITS.map((_, i) => [i, `Look ${i + 1}`])
      : a.avType === 'logo' ? [[0, 'Logo mark']]
      : ICONS.map(([, l], i) => [i, l])
    return (
      <>
        <Head eyebrow={P1} title="Design Your AI Treatment Coordinator"
          why="Your AI Treatment Coordinator will greet every visitor upon arrival to your website, so it sets the tone before a customer ever enters your MedSpa."
          open={a.help.name} onHelp={() => set((d) => { d.help.name = !d.help.name })}
          help={<>A <b>first name</b> feels most personal and tends to get the warmest replies, but pick one that isn’t a current staff member. A <b>descriptive title</b> is the safest choice if you want zero chance of a guest thinking it’s a person. A <b>brand name</b> is the most memorable. Whatever you choose, your coordinator always introduces itself as AI.</>} />

        <Q need="feel" title="Pick up to 3 words for how a guest should feel" hint="These shape the voice we write for you, and the names we suggest.">
          <ChipToggle list={FEEL} value={a.feel} onToggle={(v) => set((d) => {
            const i = d.feel.indexOf(v)
            if (i > -1) d.feel.splice(i, 1)
            else if (d.feel.length < 3) d.feel.push(v)
          })} />
          <p className="note">{a.feel.length}/3 selected</p>
        </Q>

        {generic ? (
          <Q need="name" title="Choose a name">
            <div className="callout">
              Your coordinator will introduce itself as <b>{spa.name}’s AI Treatment Coordinator</b>.{' '}
              <button type="button" className="link" onClick={() => set((d) => { d.nameStyle = ''; d.name = '' })}>Use a name instead</button>
            </div>
          </Q>
        ) : (
          <Q need="name" title="Choose a name" hint="What should your coordinator be called?">
            <div className="field" style={{ maxWidth: 420, marginBottom: 10 }}>
              <Text id="nm" label="Your coordinator’s name" value={a.name} placeholder="Type a name, like Sophie" onChange={(v) => set((d) => { d.name = v })} />
            </div>
            <div className="row">
              <Btn variant="outline" small aria-expanded={suggestOpen}
                onClick={() => set((d) => { d.help.suggest = !suggestOpen; if (!d.nameStyle) d.nameStyle = 'first' })}>
                {suggestOpen ? 'Hide suggestions' : 'Suggest names'}
              </Btn>
              <button type="button" className="link" onClick={() => set((d) => {
                d.nameStyle = 'generic'; d.name = 'AI Treatment Coordinator'; d.subtitle = 'AI Treatment Coordinator'; d.help.suggest = false; d.ideas = []
              })}>No name, keep it generic</button>
            </div>
            <Reveal open={suggestOpen}>
              <div className="panel" style={{ marginTop: 18 }}>
                <h3 style={{ margin: '0 0 4px' }}>Let’s find a name</h3>
                <p className="note" style={{ margin: '0 0 14px' }}>Pick a style, and we’ll suggest names based on it and the feelings you picked above.</p>
                <Cards value={a.nameStyle}
                  opts={NAME_STYLES.filter((o) => o.v !== 'generic' && o.v !== 'suggest').map((o) => ({ v: o.v as typeof a.nameStyle, t: o.t, d: o.d, eg: o.eg && fillShort(o.eg, spa) }))}
                  onPick={(v) => set((d) => { d.nameStyle = v; d.ideas = [] })} />
                <div style={{ marginTop: 18, maxWidth: 560 }}>
                  <Field label="Any names we should avoid?" note="For example, current staff names, so guests aren’t confused when they’re handed off to a real person.">
                    <Text value={a.avoid} placeholder="Jessica, Dr. Patel" onChange={(v) => set((d) => { d.avoid = v })} />
                  </Field>
                </div>
                {/* AI ideas from the feelings, style, and names to avoid; the fixed list if AI is unavailable. */}
                <div className="row" style={{ marginTop: 6 }}>
                  <Btn small onClick={showIdeas} disabled={thinking} aria-busy={thinking}>
                    {thinking ? 'Thinking of names…' : a.ideas.length ? 'Show new ideas' : 'Show name ideas'}
                  </Btn>
                </div>
                {a.ideas.length > 0 && (
                  /* Keyed by the list, so a new set of ideas settles in again. */
                  <div className="ideas" key={a.ideas.map(([n]) => n).join()}>
                    {a.ideas.map(([n, r]) => (
                      <button key={n} type="button" className={`idea${a.name === n ? ' on' : ''}`} onClick={() => set((d) => { d.name = n })}>
                        <b>{n}</b><span>{r}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Reveal>
          </Q>
        )}

        {!generic && (
          <Q need="subtitle" title="Subtitle under the name" hint="Shown in the chat header and next to the avatar. It must say it’s AI.">
            <div style={{ maxWidth: 420 }}>
              <Text label="Subtitle" value={a.subtitle} placeholder="AI Treatment Coordinator" onChange={(v) => set((d) => { d.subtitle = v })} />
            </div>
            <Reveal open={!/\bAI\b/.test(a.subtitle)}><p className="warn">The subtitle needs the word “AI”, like “AI Concierge” or “AI Treatment Coordinator”.</p></Reveal>
          </Q>
        )}

        <Q need="look" title="Choose a look" hint="The avatar is the first visual cue of your brand in the chat. Pick a style, then a specific look. The rest of the chat will be styled using the colors, fonts and other brand material you provided during onboarding.">
          <div className="tabs"><Seg opts={LOOK_TABS} value={a.avType} onPick={(v) => set((d) => { if (d.avType !== v) { d.avType = v; d.avId = 0; d.picked.look = false } })} /></div>
          <div className="avs">
            {tiles.map(([i, l]) => (
              <button key={i} type="button" className={`av${shown(a, 'look', a.avId) === i ? ' on' : ''}`} aria-pressed={shown(a, 'look', a.avId) === i} onClick={() => set((d) => { d.avId = i; d.picked.look = true })}>
                <Avatar type={a.avType} id={i} initial={spa.short[0] ?? ''} />{l}
              </button>
            ))}
          </div>
          <p className="note">{LOOK_NOTES[a.avType]}</p>
        </Q>
      </>
    )
  },
}

const tone: Screen = {
  id: 'tone', part: 0, title: 'Set the tone',
  done: (a) => !!a.visited.tone,
  needs: (a) => unpicked(a, 'tone'),
  preview: (a, spa) => [{ r: 'bot', t: greetingText(a, spa) }, { r: 'gst', t: 'Does Botox hurt?' }, { r: 'bot', t: toneReply(a, spa) }],
  Render: ({ a, spa, set }) => (
    <>
      <Head eyebrow={P1} title="Set the Tone"
        why="The same answer can feel warm, polished, or clinical. Pick the one that sounds most like your front desk on a good day."
        open={a.help.tone} onHelp={() => set((d) => { d.help.tone = !d.help.tone })}
        help={<>Look at how your team already replies to DMs. Most med spas land on <b>Balanced</b>: friendly enough to feel human, polished enough to feel premium. Luxury and medical-forward practices often lean <b>Polished</b>. Spas with a younger, social-first audience often lean <b>Warm</b>.</>} />
      <Q need="tone" title="Which reply sounds most like you?">
        <p className="note" style={{ margin: '0 0 12px' }}>A guest asks: “Does {a.brandNames !== 'category' ? 'Botox' : 'a neurotoxin'} hurt?”</p>
        <div className="tones">
          {TONES.map((o) => (
            <button key={o.v} type="button" className={`choice${shown(a, 'tone', a.tone) === o.v ? ' on' : ''}`} aria-pressed={shown(a, 'tone', a.tone) === o.v} onClick={() => set((d) => { d.tone = o.v; d.picked.tone = true })}>
              <b>{o.t}</b><span>{o.d}</span>
              <span className="bubble">{toneReply({ ...a, tone: o.v }, spa)}</span>
            </button>
          ))}
        </div>
        <div className="row" style={{ marginTop: 14 }}>
          <span className="note" style={{ margin: 0 }}>Somewhere between?</span>
          <Seg opts={[['warm-bal', 'Warm and balanced'], ['bal-pol', 'Balanced and polished']]} value={shown(a, 'tone', a.tone)} onPick={(v) => set((d) => { d.tone = v; d.picked.tone = true })} />
        </div>
      </Q>
      <Q need="emoji" title="Emojis"><Seg opts={[['never', 'Never'], ['occasionally', 'Occasionally']]} value={shown(a, 'emoji', a.emoji)} onPick={(v) => set((d) => { d.emoji = v; d.picked.emoji = true })} /></Q>
      <Q need="exclaim" title="Exclamation points"><Seg opts={[['yes', 'Yes'], ['sparingly', 'Sparingly'], ['never', 'Never']]} value={shown(a, 'exclaim', a.exclaim)} onPick={(v) => set((d) => { d.exclaim = v; d.picked.exclaim = true })} /></Q>
      <Q need="length" title="Reply length"><Seg opts={[['short', 'Short and quick'], ['detail', 'A bit more detail']]} value={shown(a, 'length', a.length)} onPick={(v) => set((d) => { d.length = v; d.picked.length = true })} /></Q>
    </>
  ),
}

export const PART1: Screen[] = [welcome, name, tone]
