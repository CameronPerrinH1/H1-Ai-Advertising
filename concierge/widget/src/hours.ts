// Open or closed right now, in the spa's own time zone (not the visitor's).
import type { Lang } from '@concierge/shared';
import type { UiStrings } from './i18n';

const KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

function timeLabel(hhmm: string, lang: Lang): string {
  const d = new Date(Date.UTC(2026, 0, 1, Number(hhmm.slice(0, 2)), Number(hhmm.slice(3, 5))));
  return d.toLocaleTimeString(lang === 'es' ? 'es-US' : 'en-US', { hour: 'numeric', minute: hhmm.endsWith(':00') ? undefined : '2-digit', timeZone: 'UTC' });
}

function dayName(key: string, lang: Lang): string {
  const index = KEYS.indexOf(key as (typeof KEYS)[number]);
  // Jan 4, 2026 is a Sunday.
  return new Date(Date.UTC(2026, 0, 4 + index, 12)).toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', { weekday: 'short', timeZone: 'UTC' });
}

export function openStatus(hours: Record<string, string>, timezone: string, s: UiStrings, lang: Lang, now = new Date()): { open: boolean; text: string } | null {
  if (!Object.keys(hours).length) return null;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const todayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday ?? 'Sun');
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
  const today = hours[KEYS[todayIndex]!];
  if (today) {
    const [start = '', end = ''] = today.split('-');
    if (minutes >= toMin(start) && minutes < toMin(end)) return { open: true, text: s.openNow(timeLabel(end, lang)) };
  }
  for (let i = 0; i < 8; i++) {
    const key = KEYS[(todayIndex + i) % 7]!;
    const range = hours[key];
    if (!range) continue;
    const start = range.split('-')[0] ?? '';
    if (i === 0 && minutes >= toMin(start)) continue;
    return { open: false, text: s.closedNow(`${i === 0 ? s.today : dayName(key, lang)} ${timeLabel(start, lang)}`) };
  }
  return null;
}
