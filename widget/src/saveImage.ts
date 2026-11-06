// "Save my plan" (D63): draws a branded image of a card on the visitor's own device. Nothing is
// uploaded or sent, so no visitor data leaves their phone. Uses the share sheet on phones
// (Save to Photos) and a download elsewhere.
import type { Card, Lang, PublicConfig } from '@concierge/shared';
import { dayDate, money, priceLabel, type UiStrings } from './i18n';

interface Row {
  left: string;
  right?: string;
  sub?: string;
}

export interface Sheet {
  eyebrow: string;
  title: string;
  subtitle?: string;
  rows: Row[];
  total?: { label: string; value: string };
  notes: string[];
}

function estimateTotal(total: number, from: boolean, s: UiStrings): string {
  return `${s.about} ${money(total)}${from ? '+' : ''}`;
}

export function sheetFromCard(card: Card, s: UiStrings, lang: Lang, config: PublicConfig): Sheet | null {
  switch (card.type) {
    case 'treatment_options':
      return {
        eyebrow: s.yourOptions,
        title: card.headline ?? s.yourOptions,
        rows: card.items.map((i) => ({
          left: i.service.name,
          right: i.service.promo ? money(i.service.promo.price) : priceLabel(i.service.price, s),
          sub: `${i.reason} · ${s.downtime}: ${i.service.downtime}`,
        })),
        notes: [s.optionsNote],
      };
    case 'event_plan':
      return {
        eyebrow: s.countdown,
        title: s.countdownTo(card.label),
        subtitle: `${dayDate(card.eventDate, lang)} · ${s.daysToGo(card.daysToGo)}`,
        rows: [
          ...card.items.map((i) => ({
            left: dayDate(i.date, lang),
            right: i.service.name,
            sub: `${s.daysBefore(i.daysBefore)} · ${s.downtime}: ${i.service.downtime}`,
          })),
          { left: dayDate(card.eventDate, lang), right: s.theDay },
        ],
        total: { label: s.estimatedTotal, value: estimateTotal(card.estimate.total, card.estimate.totalIsFrom, s) },
        notes: [
          ...(card.skipped.length ? [s.tooClose(card.skipped.map((x) => x.service.name).join(', '))] : []),
          ...(card.estimate.perUnit.length ? [s.pricedAtVisit(card.estimate.perUnit.join(', '))] : []),
          s.estimateNote,
        ],
      };
    case 'estimate':
      return {
        eyebrow: s.estimate,
        title: s.yourVisit,
        rows: card.estimate.lines.map((l) => ({
          left: l.addOn ? `${l.name} (${s.addOn})` : l.name,
          right: l.promoPrice !== undefined ? money(l.promoPrice) : priceLabel(l.price, s),
        })),
        total: { label: s.estimatedTotal, value: estimateTotal(card.estimate.total, card.estimate.totalIsFrom, s) },
        notes: [...(card.estimate.perUnit.length ? [s.pricedAtVisit(card.estimate.perUnit.join(', '))] : []), s.estimateNote],
      };
    case 'care_guide':
      return {
        eyebrow: s.careGuide,
        title: card.service.name,
        rows: [
          { left: s.before, sub: card.before.map((x) => `• ${x}`).join('\n') },
          ...(card.dayOf.length ? [{ left: s.dayOf, sub: card.dayOf.map((x) => `• ${x}`).join('\n') }] : []),
          { left: s.after, sub: card.after.map((x) => `• ${x}`).join('\n') },
        ],
        notes: [s.careNote(config.businessName)],
      };
    case 'membership':
      return {
        eyebrow: s.membership,
        title: card.name,
        subtitle: `${money(card.monthlyPrice)} ${s.perMonth} · ${s.includes(card.perMonth, card.includedService)}`,
        rows: [
          { left: s.payPerVisit, right: `${money(card.payAsYouGo)} ${s.perYear}` },
          { left: s.asMember, right: `${money(card.member)} ${s.perYear}` },
        ],
        total: card.savings > 0 ? { label: s.savings(money(card.savings), card.visitsPerYear), value: money(card.savings) } : undefined,
        notes: [...(card.savings > 0 ? [] : [s.noSavings(card.visitsPerYear)]), ...(card.terms ? [card.terms] : [])],
      };
    default:
      return null;
  }
}

function cssVar(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/)) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > width && line) {
        lines.push(line);
        line = word;
      } else line = test;
    }
    lines.push(line);
  }
  return lines;
}

// Two passes: measure the height, then draw.
function draw(sheet: Sheet, config: PublicConfig, s: UiStrings, ctx: CanvasRenderingContext2D | null, W: number): number {
  const brand = cssVar('--brand', '#8a5f60');
  const soft = cssVar('--brand-soft', '#f6efea');
  const ink = cssVar('--ink', '#2f2a28');
  const muted = '#6c6360';
  const heading = config.branding.fonts.heading;
  const body = config.branding.fonts.body;
  const P = 80;
  const inner = W - P * 2;
  const m = ctx ?? (document.createElement('canvas').getContext('2d') as CanvasRenderingContext2D);
  let y = 0;

  // Header band
  if (ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, 260);
    g.addColorStop(0, soft);
    g.addColorStop(1, '#ffffff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, 260);
    ctx.fillStyle = brand;
    ctx.beginPath();
    ctx.arc(P + 34, 104, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `600 36px ${heading}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(config.concierge.initials, P + 34, 106);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = ink;
    ctx.font = `600 34px ${body}`;
    ctx.fillText(config.businessName, P + 88, 98);
    ctx.fillStyle = muted;
    ctx.font = `400 26px ${body}`;
    ctx.fillText(`${config.concierge.name} · ${config.concierge.disclosureLabel.en}`, P + 88, 134);
  }
  y = 220;

  m.font = `700 24px ${body}`;
  if (ctx) {
    ctx.fillStyle = brand;
    ctx.fillText(sheet.eyebrow.toUpperCase(), P, y);
  }
  y += 24;
  m.font = `600 64px ${heading}`;
  for (const line of wrap(m, sheet.title, inner)) {
    y += 72;
    if (ctx) {
      ctx.fillStyle = ink;
      ctx.font = `600 64px ${heading}`;
      ctx.fillText(line, P, y);
    }
  }
  if (sheet.subtitle) {
    m.font = `400 30px ${body}`;
    for (const line of wrap(m, sheet.subtitle, inner)) {
      y += 44;
      if (ctx) {
        ctx.fillStyle = muted;
        ctx.font = `400 30px ${body}`;
        ctx.fillText(line, P, y);
      }
    }
  }
  y += 36;

  for (const row of sheet.rows) {
    if (ctx) {
      ctx.strokeStyle = 'rgba(47,42,40,0.12)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(P, y);
      ctx.lineTo(W - P, y);
      ctx.stroke();
    }
    y += 54;
    if (ctx) {
      ctx.fillStyle = ink;
      ctx.font = `600 34px ${body}`;
      ctx.fillText(row.left, P, y);
      if (row.right) {
        ctx.textAlign = 'right';
        ctx.font = `600 34px ${body}`;
        ctx.fillStyle = brand;
        ctx.fillText(row.right, W - P, y);
        ctx.textAlign = 'left';
      }
    }
    if (row.sub) {
      m.font = `400 28px ${body}`;
      for (const line of wrap(m, row.sub, inner)) {
        y += 40;
        if (ctx) {
          ctx.fillStyle = muted;
          ctx.font = `400 28px ${body}`;
          ctx.fillText(line, P, y);
        }
      }
    }
    y += 28;
  }

  if (sheet.total) {
    y += 16;
    if (ctx) {
      ctx.fillStyle = soft;
      ctx.beginPath();
      ctx.roundRect(P, y, inner, 104, 22);
      ctx.fill();
      ctx.fillStyle = ink;
      ctx.font = `600 32px ${body}`;
      ctx.fillText(sheet.total.label, P + 32, y + 64);
      ctx.textAlign = 'right';
      ctx.fillStyle = brand;
      ctx.font = `700 40px ${body}`;
      ctx.fillText(sheet.total.value, W - P - 32, y + 66);
      ctx.textAlign = 'left';
    }
    y += 104 + 16;
  }

  y += 20;
  m.font = `400 26px ${body}`;
  for (const note of sheet.notes) {
    for (const line of wrap(m, note, inner)) {
      y += 38;
      if (ctx) {
        ctx.fillStyle = muted;
        ctx.font = `400 26px ${body}`;
        ctx.fillText(line, P, y);
      }
    }
    y += 8;
  }

  y += 60;
  if (ctx) {
    ctx.fillStyle = muted;
    ctx.font = `400 24px ${body}`;
    ctx.fillText(`${s.madeWith(config.concierge.name, config.businessName)} · ${new Date().toLocaleDateString()}`, P, y);
  }
  return y + 70;
}

export async function saveCardImage(card: Card, s: UiStrings, lang: Lang, config: PublicConfig): Promise<void> {
  const sheet = sheetFromCard(card, s, lang, config);
  if (!sheet) return;
  const W = 1080;
  // Fit the content (no forced square, so short cards don't end in a blank half).
  const height = Math.max(720, draw(sheet, config, s, null, W));
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, height);
  draw(sheet, config, s, ctx, W);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return;
  const filename = `${config.businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${card.type.replace('_', '-')}.png`;
  const file = new File([blob], filename, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: sheet.title });
      return;
    } catch {
      // Share cancelled or blocked (e.g. inside an iframe): fall back to a download.
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
