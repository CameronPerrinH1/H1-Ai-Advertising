/*
 * The gap report as a page H1 can publish privately and share (scripts/gaps.ts --html).
 * Written as page content without <html>/<head>/<body>: the publisher wraps it.
 * It opens fine as a local file too.
 */
import { LEVELS, type Level, type Report } from './gaps'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const ORDER: Level[] = ['launch', 'confirm', 'helps', 'h1']
const BLURB: Record<Level, string> = {
  launch: 'The chat can’t go live without these.',
  confirm: 'The chat would fall back on H1’s default, or two answers disagree.',
  helps: 'The chat works without these, but sells better with them.',
  h1: 'Background for H1’s reporting and setup.',
}

export function reportHtml(r: Report, generatedOn: string): string {
  const counts = ORDER.map((l) => [l, r.gaps.filter((g) => g.level === l).length] as const)
  /* Plain text of what to ask the spa, for the copy button. */
  const ask = r.gaps.filter((g) => g.level === 'launch' || g.level === 'confirm')
    .map((g) => `- ${g.where}: ${g.what}${g.detail ? ` (${g.detail})` : ''}`).join('\n')

  const sections = ORDER.map((level) => {
    const g = r.gaps.filter((x) => x.level === level)
    if (!g.length) return ''
    return `
  <section class="group" data-level="${level}">
    <header><h2>${esc(LEVELS[level])}</h2><span class="n">${g.length}</span></header>
    <p class="blurb">${esc(BLURB[level])}</p>
    <ul class="items">${g.map((x) => `
      <li>
        <div class="meta"><span class="src">${esc(x.from)}</span><span class="where">${esc(x.where)}</span></div>
        <p class="what">${esc(x.what)}</p>${x.detail ? `
        <p class="detail">${esc(x.detail)}</p>` : ''}
      </li>`).join('')}
    </ul>
  </section>`
  }).join('')

  const comments = r.comments.length ? `
  <section class="fine">
    <h2>Their comments for H1</h2>
    <ul>${r.comments.map((c) => `<li><strong>${esc(c.part)}:</strong> ${esc(c.text)}</li>`).join('')}</ul>
  </section>` : ''
  const fine = r.fine.length ? `
  <section class="fine">
    <h2>Doesn’t apply, or already covered</h2>
    <ul>${r.fine.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
  </section>` : ''
  const unknown = r.jotform?.unknown.length ? `
  <section class="fine">
    <h2>New Jotform questions</h2>
    <p class="blurb">The detector doesn’t know these yet, so it didn’t check them.</p>
    <ul>${r.jotform.unknown.map((q) => `<li>${esc(q)}</li>`).join('')}</ul>
  </section>` : ''

  return `<title>${esc(r.spa)} Gap Report</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600&display=swap">
<style>
/* One column, read top to bottom: status first, then gaps by how much they block launch. */
:root {
  --bg: #f7f6fa; --card: #ffffff; --fg: #1d1a26; --muted: #615b70; --line: #e3e0ea; --accent: #5b3fa8;
  --launch: #b42318; --launch-bg: #fdecea; --confirm: #9a5b00; --confirm-bg: #fdf3e2;
  --helps: #2f6f4f; --helps-bg: #e8f4ed; --h1: #555066; --h1-bg: #eeedf2;
  --display: "Space Grotesk", "Inter", system-ui, sans-serif; --body: "Inter", system-ui, -apple-system, sans-serif;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --bg: #15131b; --card: #1e1b26; --fg: #ece9f3; --muted: #a49db3; --line: #2f2b3a; --accent: #b39bf0;
  --launch: #f29b92; --launch-bg: #3a1d1b; --confirm: #f0bd6b; --confirm-bg: #3a2c14; --helps: #8fd0ad; --helps-bg: #18301f; --h1: #b9b4c6; --h1-bg: #26232f;
  color-scheme: dark } }
:root[data-theme="dark"] {
  --bg: #15131b; --card: #1e1b26; --fg: #ece9f3; --muted: #a49db3; --line: #2f2b3a; --accent: #b39bf0;
  --launch: #f29b92; --launch-bg: #3a1d1b; --confirm: #f0bd6b; --confirm-bg: #3a2c14; --helps: #8fd0ad; --helps-bg: #18301f; --h1: #b9b4c6; --h1-bg: #26232f;
  color-scheme: dark }
body { background: var(--bg); color: var(--fg); font: 15px/1.55 var(--body); }
.page { max-width: 760px; margin: 0 auto; padding-block: 40px 64px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); display: grid; gap: 28px; }
h1, h2 { font-family: var(--display); text-wrap: balance; margin: 0; }
h1 { font-size: 2rem; line-height: 1.15; letter-spacing: -0.01em; }
h2 { font-size: 1.15rem; }
.eyebrow { font-size: .75rem; letter-spacing: .08em; text-transform: uppercase; color: var(--accent); font-weight: 600; margin: 0 0 6px; }
.status { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
.status div { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 12px 14px; min-width: 0; }
.status b { display: block; font-size: .75rem; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); font-weight: 600; }
.tally { display: flex; flex-wrap: wrap; gap: 8px; }
.pill { font-size: .85rem; font-weight: 600; padding: 4px 10px; border-radius: 999px; font-variant-numeric: tabular-nums; }
[data-level="launch"] { --c: var(--launch); --cb: var(--launch-bg); }
[data-level="confirm"] { --c: var(--confirm); --cb: var(--confirm-bg); }
[data-level="helps"] { --c: var(--helps); --cb: var(--helps-bg); }
[data-level="h1"] { --c: var(--h1); --cb: var(--h1-bg); }
.pill { color: var(--c); background: var(--cb); }
.group { display: grid; gap: 8px; }
.group header { display: flex; align-items: center; gap: 10px; }
.group .n { color: var(--c); background: var(--cb); font-weight: 600; font-size: .8rem; padding: 2px 9px; border-radius: 999px; font-variant-numeric: tabular-nums; }
.blurb { margin: 0; color: var(--muted); }
.items { list-style: none; margin: 4px 0 0; padding: 0; background: var(--card); border: 1px solid var(--line); border-left: 3px solid var(--c); border-radius: 10px; }
.items li { padding: 12px 16px; display: grid; gap: 4px; min-width: 0; }
.items li + li { border-top: 1px solid var(--line); }
.meta { display: flex; flex-wrap: wrap; gap: 6px 10px; font-size: .8rem; color: var(--muted); }
.src { font-weight: 600; color: var(--fg); }
.what { margin: 0; font-weight: 500; overflow-wrap: anywhere; }
.detail { margin: 0; color: var(--muted); font-size: .9rem; overflow-wrap: anywhere; }
.fine ul { margin: 8px 0 0; padding-left: 20px; color: var(--muted); display: grid; gap: 4px; }
.copy { justify-self: start; font: 600 .9rem var(--body); color: var(--card); background: var(--accent); border: 0; border-radius: 8px; padding: 9px 14px; cursor: pointer; }
.copy:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
textarea.ask { width: 100%; min-height: 8em; font: .85rem/1.5 var(--body); color: var(--fg); background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 10px; box-sizing: border-box; }
.foot { color: var(--muted); font-size: .8rem; }
</style>
<main class="page">
  <div>
    <p class="eyebrow">Gap report</p>
    <h1>${esc(r.spa)}</h1>
  </div>
  <div class="status">
    <div><b>Design form</b>${r.signoff ? `Signed off by ${esc(r.signoff.name)} on ${esc(r.signoff.on)}${r.signoff.current ? '' : '. Answers changed since.'}` : 'Not signed off'}</div>
    <div><b>Jotform</b>${r.jotform ? `Submitted ${esc(r.jotform.submitted)}` : 'Not checked'}</div>
  </div>
  <div class="tally">${counts.filter(([, n]) => n).map(([l, n]) => `<span class="pill" data-level="${l}">${n} ${esc(LEVELS[l].replace(/ \(.*\)$/, '').toLowerCase())}</span>`).join('')}</div>${ask ? `
  <button class="copy" id="copy-ask" type="button">Copy what to ask the spa</button>
  <textarea class="ask" id="ask-text" readonly hidden>${esc(ask)}</textarea>` : ''}
${sections}
${comments}
${fine}
${unknown}
  <p class="foot">Generated ${esc(generatedOn)} from the Design Questionnaire and the General Onboarding Jotform.</p>
</main>
<script>
const b = document.getElementById('copy-ask'), t = document.getElementById('ask-text')
if (b && t) b.addEventListener('click', () => {
  navigator.clipboard.writeText(t.value).then(() => { b.textContent = 'Copied' }, () => { t.hidden = false; t.select(); b.textContent = 'Select and copy the text below' })
})
</script>
`
}
