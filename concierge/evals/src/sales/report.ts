// The sales review page: one self-contained HTML file. Published as a private Artifact with the db
// capability, its note boxes save to the artifact's database (collection "notes"), where H1 reads
// them back to turn into rules or new scenarios. Opened as a local file, notes are simply off.
import { describeCards, type Run } from './types.ts';

export interface ReportMeta {
  client: string;
  model: string;
  effort: string;
  thinking: string;
  grader: string;
  date: string;
  stats: { conversations: number; replies: number; medianMs: number; p90Ms: number; avgScore: number; needsFix: number };
}

// The page reads a trimmed copy of the runs: what a reviewer needs, nothing else.
function slim(runs: Run[]) {
  return runs.map((r) => {
    const flags = [...r.flags, ...r.turns.flatMap((t) => t.flags)];
    const major = flags.some((f) => f.severity === 'major') || !!r.grade?.replies.some((g) => g.verdict === 'major') || !!r.error;
    const minor = flags.length > 0 || (r.grade ? r.grade.score < 4 || r.grade.replies.some((g) => g.verdict === 'minor') : false);
    return {
      id: `${r.scenario.id}-${r.copy}`,
      scenario: r.scenario.id,
      title: r.scenario.title,
      why: r.scenario.why ?? '',
      page: r.scenario.page ?? '/home-chat',
      simulated: !!r.scenario.guest,
      status: major ? 'fix' : minor ? 'check' : 'good',
      score: r.grade?.score ?? null,
      summary: r.grade?.summary ?? r.error ?? '',
      flags: r.flags,
      turns: r.turns.map((t, i) => ({
        guest: t.guest,
        via: t.via,
        text: t.reply.text,
        cards: describeCards(t.reply.cards),
        chips: t.reply.quickReplies,
        ms: t.ms,
        flags: t.flags,
        grade: r.grade?.replies.find((g) => g.turn === i + 1) ?? null,
      })),
    };
  });
}

export function renderReport(meta: ReportMeta, runs: Run[]): string {
  const runKey = meta.date.replace(/[^0-9]/g, '').slice(0, 14);
  const data = JSON.stringify({ meta: { ...meta, runKey }, runs: slim(runs) }).replace(/</g, '\\u003c');
  return `<title>Mila Sales Review</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap">
<style>
/* Layout: a review queue. Summary up top, then one block per conversation; each reply carries its verdict, a better version, and a notes box. */
:root {
  --bg: #f6f7f9; --panel: #ffffff; --ink: #14202e; --muted: #5d6b7c; --line: #dde2e8;
  --accent: #032e5b; --gold: #ae7f54; --guest: #e9eef5; --mila: #faf6f1;
  --good: #1f7a4d; --good-bg: #e3f3ea; --warn: #9a6200; --warn-bg: #fbf0d9; --bad: #b42318; --bad-bg: #fde8e6;
  --display: 'Hanken Grotesk', 'Avenir Next', -apple-system, 'Segoe UI', sans-serif;
  --body: 'Hanken Grotesk', 'Avenir Next', -apple-system, 'Segoe UI', sans-serif;
  --mono: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --bg: #0f151c; --panel: #17202a; --ink: #e6ebf1; --muted: #93a1b2; --line: #2a3644;
  --accent: #8fb4e3; --gold: #d6aa7f; --guest: #1f2b3a; --mila: #241f1a;
  --good: #6fd19f; --good-bg: #16301f; --warn: #f0be62; --warn-bg: #33270f; --bad: #ff8a80; --bad-bg: #3a1714; color-scheme: dark } }
:root[data-theme="dark"] {
  --bg: #0f151c; --panel: #17202a; --ink: #e6ebf1; --muted: #93a1b2; --line: #2a3644;
  --accent: #8fb4e3; --gold: #d6aa7f; --guest: #1f2b3a; --mila: #241f1a;
  --good: #6fd19f; --good-bg: #16301f; --warn: #f0be62; --warn-bg: #33270f; --bad: #ff8a80; --bad-bg: #3a1714; color-scheme: dark }
body { background: var(--bg); color: var(--ink); font: 15px/1.5 var(--body); }
.wrap { max-width: 1040px; margin: 0 auto; padding-block: 28px 64px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); display: grid; gap: 22px; }
header { display: grid; gap: 6px; }
.eyebrow { font: 600 12px/1 var(--body); letter-spacing: .08em; text-transform: uppercase; color: var(--gold); }
h1 { margin: 0; font: 700 28px/1.15 var(--display); text-wrap: balance; color: var(--accent); }
.meta { color: var(--muted); font-size: 13px; }
.meta code { font: 12px var(--mono); }
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
.stat { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 12px 14px; display: grid; gap: 2px; }
.stat b { font: 600 22px/1.2 var(--mono); font-variant-numeric: tabular-nums; }
.stat span { color: var(--muted); font-size: 13px; }
.filters { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.filters button { font: 500 13px var(--body); padding: 6px 12px; border-radius: 999px; border: 1px solid var(--line); background: var(--panel); color: var(--ink); cursor: pointer; }
.filters button[aria-pressed="true"] { background: var(--accent); border-color: var(--accent); color: var(--panel); }
.filters .hint { color: var(--muted); font-size: 13px; margin-left: auto; }
.conv { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }
.conv > summary { list-style: none; cursor: pointer; padding: 14px 16px; display: grid; grid-template-columns: auto 1fr auto; gap: 12px; align-items: center; }
.conv > summary::-webkit-details-marker { display: none; }
.conv > summary:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
.conv h2 { margin: 0; font: 600 16px/1.3 var(--display); }
.conv .sum { color: var(--muted); font-size: 13.5px; min-width: 0; }
.pill { font: 600 11.5px/1 var(--body); letter-spacing: .04em; text-transform: uppercase; padding: 5px 8px; border-radius: 6px; white-space: nowrap; }
.pill.fix, .pill.major { background: var(--bad-bg); color: var(--bad); }
.pill.check, .pill.minor { background: var(--warn-bg); color: var(--warn); }
.pill.good { background: var(--good-bg); color: var(--good); }
.score { font: 500 13px var(--mono); color: var(--muted); font-variant-numeric: tabular-nums; }
.body { border-top: 1px solid var(--line); padding: 14px 16px 18px; display: grid; gap: 14px; }
.why { color: var(--muted); font-size: 13.5px; margin: 0; }
.why strong { color: var(--ink); font-weight: 600; }
.turn { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: 14px; padding-top: 14px; border-top: 1px dashed var(--line); }
.turn:first-of-type { border-top: 0; padding-top: 0; }
.chat { display: grid; gap: 8px; min-width: 0; }
.bubble { padding: 9px 12px; border-radius: 12px; max-width: 92%; white-space: pre-wrap; overflow-wrap: anywhere; }
.bubble.guest { justify-self: end; background: var(--guest); border-bottom-right-radius: 4px; }
.bubble.mila { background: var(--mila); border: 1px solid var(--line); border-top-left-radius: 4px; }
.via { font-size: 11.5px; color: var(--muted); justify-self: end; }
.extra { display: grid; gap: 4px; font-size: 12.5px; color: var(--muted); }
.extra .card { font-family: var(--mono); font-size: 11.5px; }
.chips { display: flex; flex-wrap: wrap; gap: 5px; }
.chips span { border: 1px solid var(--line); border-radius: 999px; padding: 2px 8px; font-size: 12px; color: var(--ink); }
.ms { font: 11.5px var(--mono); color: var(--muted); font-variant-numeric: tabular-nums; }
.review { display: grid; gap: 8px; align-content: start; min-width: 0; }
.issues { margin: 0; padding-left: 18px; font-size: 13.5px; display: grid; gap: 3px; }
.better { border-left: 3px solid var(--good); background: var(--good-bg); padding: 8px 10px; border-radius: 0 8px 8px 0; font-size: 13.5px; }
.better b { display: block; font: 600 11px var(--body); letter-spacing: .06em; text-transform: uppercase; color: var(--good); margin-bottom: 2px; }
.flag { font-size: 13px; }
.flag code { font: 11.5px var(--mono); padding: 1px 5px; border-radius: 4px; background: var(--bg); }
.note { display: grid; gap: 6px; }
.note textarea { width: 100%; min-height: 54px; resize: vertical; font: 13.5px/1.4 var(--body); color: var(--ink); background: var(--bg); border: 1px solid var(--line); border-radius: 8px; padding: 7px 9px; box-sizing: border-box; }
.note textarea:focus-visible { outline: 2px solid var(--accent); outline-offset: 0; }
.note .row { display: flex; gap: 8px; align-items: center; }
.note button { font: 600 12.5px var(--body); padding: 5px 12px; border-radius: 7px; border: 0; background: var(--accent); color: var(--panel); cursor: pointer; }
.note button:disabled { opacity: .5; cursor: default; }
.note .status { font-size: 12px; color: var(--muted); }
.notes-off { font-size: 12.5px; color: var(--muted); }
@media (max-width: 720px) { .turn { grid-template-columns: minmax(0, 1fr); } .conv > summary { grid-template-columns: auto 1fr; } .conv > summary .score { grid-column: 2; } .filters .hint { margin-left: 0; width: 100%; } }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
</style>
<div class="wrap">
  <header>
    <span class="eyebrow">Plumb + Pine · test conversations</span>
    <h1>How Mila sells</h1>
    <p class="meta" id="meta"></p>
  </header>
  <section class="stats" id="stats" aria-label="Summary"></section>
  <div class="filters" role="group" aria-label="Show">
    <button type="button" id="f-all" data-f="all" aria-pressed="true">All</button>
    <button type="button" id="f-fix" data-f="fix" aria-pressed="false">Needs a fix</button>
    <button type="button" id="f-check" data-f="check" aria-pressed="false">Worth a look</button>
    <button type="button" id="f-good" data-f="good" aria-pressed="false">Good</button>
    <span class="hint" id="notes-state">Notes load once the page connects.</span>
  </div>
  <main id="list" style="display:grid;gap:12px"></main>
</div>
<script type="application/json" id="data">${data}</script>
<script>
(() => {
  const D = JSON.parse(document.getElementById('data').textContent);
  const $ = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const sec = (ms) => (ms / 1000).toFixed(1) + 's';
  const m = D.meta, s = m.stats;
  document.getElementById('meta').textContent = new Date(m.date).toLocaleString() + ' · chat model ' + m.model + ' (effort ' + m.effort + ', thinking ' + m.thinking + ') · graded by ' + m.grader;
  const stats = [
    [s.conversations + '', 'conversations, ' + s.replies + ' replies'],
    [sec(s.medianMs), 'typical wait per reply'],
    [sec(s.p90Ms), 'slowest 1 in 10'],
    [s.avgScore ? s.avgScore.toFixed(1) + ' / 5' : 'n/a', 'average grade'],
    [s.needsFix + '', 'need a fix'],
  ];
  const st = document.getElementById('stats');
  for (const [b, l] of stats) { const d = $('div', 'stat'); d.append($('b', null, b), $('span', null, l)); st.append(d); }

  const LABEL = { fix: 'Needs a fix', check: 'Worth a look', good: 'Good' };
  const boxes = new Map(); // note id -> {ta, status, btn}
  const list = document.getElementById('list');
  for (const r of D.runs) {
    const det = $('details', 'conv'); det.dataset.status = r.status; if (r.status === 'fix') det.open = true;
    const sum = $('summary');
    sum.append($('span', 'pill ' + r.status, LABEL[r.status]));
    const t = $('div'); t.style.minWidth = '0';
    t.append($('h2', null, r.title + (r.simulated ? ' ·  simulated guest' : '')), $('div', 'sum', r.summary));
    sum.append(t, $('span', 'score', r.score != null ? r.score + '/5' : ''));
    det.append(sum);
    const body = $('div', 'body');
    if (r.why) { const p = $('p', 'why'); p.append($('strong', null, 'Checks: '), document.createTextNode(r.why + '  (page ' + r.page + ')')); body.append(p); }
    for (const f of r.flags) { const p = $('div', 'flag'); p.append($('code', null, f.rule), document.createTextNode(' ' + f.note)); body.append(p); }
    r.turns.forEach((tn, i) => {
      const row = $('div', 'turn');
      const chat = $('div', 'chat');
      chat.append($('div', 'bubble guest', tn.guest));
      if (tn.via !== 'typed') chat.append($('span', 'via', tn.via === 'chip' ? 'tapped a chip' : 'tapped Confirm'));
      chat.append($('div', 'bubble mila', tn.text || '(no text)'));
      const ex = $('div', 'extra');
      for (const c of tn.cards) ex.append($('div', 'card', c));
      if (tn.chips.length) { const ch = $('div', 'chips'); for (const c of tn.chips) ch.append($('span', null, c)); ex.append(ch); }
      ex.append($('span', 'ms', 'reply ' + (i + 1) + ' · ' + sec(tn.ms)));
      chat.append(ex);
      const rv = $('div', 'review');
      const g = tn.grade;
      if (g) {
        rv.append($('span', 'pill ' + g.verdict, g.verdict === 'major' ? 'Major issue' : g.verdict === 'minor' ? 'Minor issue' : 'Good'));
        rv.lastChild.style.justifySelf = 'start';
        if (g.issues && g.issues.length) { const ul = $('ul', 'issues'); for (const x of g.issues) ul.append($('li', null, x)); rv.append(ul); }
        if (g.better) { const b = $('div', 'better'); b.append($('b', null, 'Better'), document.createTextNode(g.better)); rv.append(b); }
      }
      for (const f of tn.flags) { const p = $('div', 'flag'); p.append($('code', null, f.rule), document.createTextNode(' ' + f.note)); rv.append(p); }
      if (tn.via !== 'confirm') {
        const id = m.runKey + '--' + r.id + '--' + (i + 1);
        const note = $('div', 'note');
        const ta = $('textarea'); ta.id = 'n-' + id; ta.placeholder = 'Your note on this reply (what you would want instead)'; ta.disabled = true;
        ta.setAttribute('aria-label', 'Note on reply ' + (i + 1) + ' of ' + r.title);
        const btn = $('button', null, 'Save note'); btn.type = 'button'; btn.disabled = true; btn.id = 'b-' + id;
        const status = $('span', 'status');
        const rowB = $('div', 'row'); rowB.append(btn, status);
        note.append(ta, rowB);
        rv.append(note);
        boxes.set(id, { ta, btn, status, r, i });
      }
      row.append(chat, rv);
      body.append(row);
    });
    det.append(body);
    list.append(det);
  }

  for (const b of document.querySelectorAll('.filters button')) b.addEventListener('click', () => {
    for (const o of document.querySelectorAll('.filters button')) o.setAttribute('aria-pressed', String(o === b));
    for (const d of list.children) d.hidden = b.dataset.f !== 'all' && d.dataset.status !== b.dataset.f;
  });

  // Notes: the artifact's database, when this view has it.
  const state = document.getElementById('notes-state');
  (async () => {
    const db = window.claude && window.claude.use ? await window.claude.use('db') : null;
    if (!db) { state.textContent = 'Notes are off in this view (sign in to claude.ai to add them).'; return; }
    for (const { ta, btn } of boxes.values()) { ta.disabled = false; ta.addEventListener('input', () => { btn.disabled = false; }); }
    for (const [id, x] of boxes) x.btn.addEventListener('click', async () => {
      x.btn.disabled = true; x.status.textContent = 'Saving…';
      try {
        await db.collection('notes').doc(id).set({ run: m.runKey, conversation: x.r.id, scenario: x.r.scenario, reply: x.i + 1, note: x.ta.value.trim(), saved: new Date().toISOString() });
        x.status.textContent = 'Saved';
      } catch (e) { x.status.textContent = 'Not saved: ' + ((e && e.message) || 'try again'); x.btn.disabled = false; }
    });
    state.textContent = 'Loading notes…';
    const timer = setTimeout(() => { state.textContent = "Notes can't be reached yet; you can still type and save."; }, 10000);
    db.collection('notes').where('run', '==', m.runKey).onSnapshot((snap) => {
      if (!snap.metadata || !snap.metadata.fromCache) clearTimeout(timer);
      let n = 0;
      for (const d of snap.docs) {
        const x = boxes.get(d.id), v = d.data();
        if (!x || !v) continue;
        n += v.note ? 1 : 0;
        if (document.activeElement !== x.ta && x.btn.disabled) x.ta.value = v.note || '';
      }
      state.textContent = n ? n + ' note' + (n === 1 ? '' : 's') + ' saved on this run' : 'Notes save for H1 to read.';
    }, () => { clearTimeout(timer); state.textContent = 'Notes stopped syncing; reload the page.'; });
  })();
})();
</script>
`;
}
