import { describe, expect, it } from 'vitest';
import { planEvent, PlanError } from '../src/planning.ts';
import { catalog, TODAY } from './helpers.ts';

// The demo spa is open Tuesday to Saturday. TODAY (Oct 23, 2026) is a Friday.
describe('event countdown planner (D62)', () => {
  it('schedules each treatment at its ideal lead time and sorts by date', () => {
    const plan = planEvent(catalog, ['hydrafacial', 'botox'], '2026-11-21', TODAY);
    expect(plan.daysToGo).toBe(29);
    expect(plan.items).toEqual([
      { serviceId: 'botox', date: '2026-10-31', daysBefore: 21, tight: false },
      { serviceId: 'hydrafacial', date: '2026-11-18', daysBefore: 3, tight: false },
    ]);
    expect(plan.skipped).toEqual([]);
  });

  it('moves a date off a closed day, earlier first', () => {
    // Three days before Wed Nov 25 is a Sunday; Saturday keeps more lead time.
    const plan = planEvent(catalog, ['hydrafacial'], '2026-11-25', TODAY);
    expect(plan.items[0]).toMatchObject({ date: '2026-11-21', daysBefore: 4, tight: false });
  });

  it('puts treatments on separate days when there is room', () => {
    // Botox and a peel both ideally go 21 days out (Sat Nov 14); the peel moves to Friday.
    const plan = planEvent(catalog, ['botox', 'chemical-peel', 'hydrafacial'], '2026-12-05', TODAY);
    expect(plan.items.map((i) => [i.serviceId, i.date])).toEqual([
      ['chemical-peel', '2026-11-13'],
      ['botox', '2026-11-14'],
      ['hydrafacial', '2026-12-02'],
    ]);
  });

  it('moves later when earlier would be in the past, keeping the minimum lead time', () => {
    // From Sunday Oct 25 to Friday Oct 30, laser (min 2, ideal 7) can't start before Tuesday.
    const plan = planEvent(catalog, ['laser-hair-removal'], '2026-10-30', '2026-10-25');
    expect(plan.items[0]).toMatchObject({ date: '2026-10-27', daysBefore: 3, tight: true });
  });

  it('leaves out treatments that need more time than is left', () => {
    const plan = planEvent(catalog, ['botox', 'hydrafacial'], '2026-10-28', TODAY);
    expect(plan.skipped).toEqual([{ serviceId: 'botox', minDays: 14 }]);
    expect(plan.items.map((i) => i.serviceId)).toEqual(['hydrafacial']);
  });

  it('rejects past dates, dates over a year out, and treatments with no timing', () => {
    expect(() => planEvent(catalog, ['hydrafacial'], '2026-10-01', TODAY)).toThrow(PlanError);
    expect(() => planEvent(catalog, ['hydrafacial'], '2027-12-01', TODAY)).toThrow(PlanError);
    expect(() => planEvent(catalog, ['injectable-consultation'], '2026-11-21', TODAY)).toThrow(PlanError);
  });
});

describe('visit estimate (D62)', () => {
  it('totals session prices with active promotions and add-ons, and lists per-unit prices apart', () => {
    const e = catalog.estimate(['hydrafacial', 'botox', 'chemical-peel'], ['led-light-therapy-add-on'], TODAY);
    expect(e.total).toBe(199 + 120 + 35); // the fall peel promotion is active
    expect(e.perUnit).toEqual(['Botox']);
    expect(e.lines.find((l) => l.name === 'Botox')?.counted).toBe(false);
    expect(e.lines.find((l) => l.name === 'Chemical Peel')?.promoPrice).toBe(120);
    expect(e.totalIsFrom).toBe(false);
  });

  it('marks the total as a starting price when a treatment is priced "from"', () => {
    expect(catalog.estimate(['laser-hair-removal'], [], TODAY)).toMatchObject({ total: 99, totalIsFrom: true });
  });
});

describe('membership savings (D62)', () => {
  it('compares a year of visits with and without the membership', () => {
    expect(catalog.membershipSavings(undefined, 12)).toMatchObject({ payAsYouGo: 2388, member: 2028, savings: 360 });
    // Visits beyond the included ones get the member discount.
    expect(catalog.membershipSavings('glow-membership', 18)).toMatchObject({ payAsYouGo: 3582, member: 3103, savings: 479 });
  });

  it('is honest when the membership costs more', () => {
    expect(catalog.membershipSavings(undefined, 6)!.savings).toBe(-834);
    expect(catalog.membershipSavings('no-such-plan', 12)).toBeUndefined();
  });
});
