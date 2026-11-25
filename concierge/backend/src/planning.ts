// Event countdown planner (D62). The model picks the treatments and the event date; code works out
// when to have each one from the approved timing fields, keeps dates on days the spa is open and
// (when there's room) one treatment per day, and leaves out anything that can't fit before the event.
import type { Catalog } from './catalog.ts';

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000);
}

export function addDays(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

export interface PlannedItem {
  serviceId: string;
  date: string;
  daysBefore: number;
  tight: boolean; // less lead time than ideal
}

export interface EventPlan {
  daysToGo: number;
  items: PlannedItem[];
  skipped: { serviceId: string; minDays: number }[];
}

export class PlanError extends Error {}

export function planEvent(catalog: Catalog, serviceIds: string[], eventDate: string, today: string): EventPlan {
  const daysToGo = daysBetween(today, eventDate);
  if (Number.isNaN(daysToGo)) throw new PlanError('event_date must be a real date, YYYY-MM-DD.');
  if (daysToGo < 1) throw new PlanError('The event date must be in the future.');
  if (daysToGo > 365) throw new PlanError('The event must be within a year.');

  const timed = serviceIds.map((id) => {
    const timing = catalog.services.get(id)?.details.timing;
    if (!timing) throw new PlanError(`There's no event timing for "${id}". Leave it out of the plan.`);
    return { id, min: timing.min_days_before_event, ideal: timing.ideal_days_before_event };
  });
  // Longest lead time first, so the treatments that need the most time get their ideal day.
  timed.sort((a, b) => b.ideal - a.ideal);

  const items: PlannedItem[] = [];
  const skipped: EventPlan['skipped'] = [];
  const used = new Set<string>();
  for (const { id, min, ideal } of timed) {
    if (daysToGo < min) {
      skipped.push({ serviceId: id, minDays: min });
      continue;
    }
    const target = addDays(eventDate, -Math.min(ideal, daysToGo));
    const date = nearestOpenDay(catalog, target, today, eventDate, min, used) ?? nearestOpenDay(catalog, target, today, eventDate, min, new Set());
    if (!date) {
      skipped.push({ serviceId: id, minDays: min });
      continue;
    }
    used.add(date);
    const daysBefore = daysBetween(date, eventDate);
    items.push({ serviceId: id, date, daysBefore, tight: daysBefore < ideal });
  }
  items.sort((a, b) => a.date.localeCompare(b.date));
  return { daysToGo, items, skipped };
}

// Prefer moving earlier (more lead time); if that would be in the past, move later as long as the
// treatment still has its minimum lead time. Skips days another treatment already has.
function nearestOpenDay(catalog: Catalog, target: string, today: string, eventDate: string, minDays: number, taken: Set<string>): string | undefined {
  const free = (d: string) => catalog.isOpenDay(d) && !taken.has(d);
  for (let k = 0; k <= 6; k++) {
    const d = addDays(target, -k);
    if (d < today) break;
    if (free(d)) return d;
  }
  for (let k = 1; k <= 6; k++) {
    const d = addDays(target, k);
    if (daysBetween(d, eventDate) < minDays) break;
    if (d >= today && free(d)) return d;
  }
  return undefined;
}
