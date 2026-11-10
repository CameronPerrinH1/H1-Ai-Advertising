import { describe, expect, it } from 'vitest';
import { checkText } from '../src/checks/output.ts';
import { catalog, TODAY } from './helpers.ts';
import { Catalog } from '../src/catalog.ts';
import { loadClient } from '../src/config/load.ts';

const ok = (t: string, today = TODAY) => checkText(t, catalog, today).ok;

describe('output checks (D13)', () => {
  it('allows catalog, add-on, policy, and active promotion prices', () => {
    expect(ok('A HydraFacial is $199 and the Deluxe is $279.')).toBe(true);
    expect(ok('Botox is $13 per unit and Dysport is $4.50 per unit.')).toBe(true);
    expect(ok('Add lymphatic drainage for $45.')).toBe(true);
    expect(ok('Late cancellations have a $50 fee.')).toBe(true);
    expect(ok('Chemical peels are 20% off this month: $120 instead of $150.')).toBe(true);
    expect(ok('Consultations are $0.')).toBe(true);
  });

  it('blocks invented prices and totals', () => {
    expect(ok('A HydraFacial is $175.')).toBe(false);
    expect(ok('20 units of Botox would be $260.')).toBe(false);
  });

  it('blocks discounts that are not active', () => {
    expect(ok('Botox is 50% off today.')).toBe(false);
    expect(ok('Take $30 off the Deluxe.')).toBe(false); // starts Nov 15
    expect(ok('Take $30 off the Deluxe.', '2026-11-20')).toBe(true);
    expect(ok('Chemical peels are 20% off.', '2026-11-05')).toBe(false); // ended Oct 31
  });

  it('allows only configured links', () => {
    expect(ok('Book here: https://book.glowmedspa.example/services/hydrafacial')).toBe(true);
    expect(ok('See https://glowmedspa.example/privacy.')).toBe(true);
    expect(ok('Try https://evil.example.com/deal')).toBe(false);
    expect(ok('Visit www.othersite.com for more')).toBe(false);
  });

  it('allows only the business phone and urgent line', () => {
    expect(ok('Call us at (555) 555-0100.')).toBe(true);
    expect(ok('Our urgent line is 555-555-0199.')).toBe(true);
    expect(ok('Text Maya at 503-555-0188.')).toBe(false);
  });

  it('blocks card numbers and overly long replies', () => {
    expect(ok('Your card 4111 1111 1111 1111 is saved.')).toBe(false);
    expect(ok('x'.repeat(1600))).toBe(false);
  });

  it('reports which promotions were mentioned', () => {
    expect(checkText('Peels are 20% off right now.', catalog, TODAY).promotionsMentioned).toEqual(['fall-peel-2026']);
  });
});

describe('output checks by audience', () => {
  it('allows membership prices and member discounts for guests', () => {
    expect(ok('The Glow Membership is $169 a month with 10% off extra visits.')).toBe(true);
  });

  it('lets staff talk about any number but still blocks unknown links', () => {
    const staff = (t: string) => checkText(t, catalog, TODAY, undefined, undefined, 'staff').ok;
    expect(staff('If a guest asks about a $175 package, say it is not on our menu.')).toBe(true);
    expect(staff('Send them to https://example.com/deal')).toBe(false);
  });
});

// Plumb + Pine (Nov 10 sales review): claims the spa never made.
describe('output checks: facts the spa did not give', () => {
  const pp = new Catalog(loadClient('plumb-and-pine'));
  const okPP = (t: string) => checkText(t, pp, TODAY).ok;
  it('blocks downtime claims unless that treatment lists its downtime', () => {
    expect(okPP('The Platinum Hydrafacial has no downtime, so it fits before your wedding.')).toBe(false);
    expect(okPP('Great choice, the Platinum Hydrafacial. It has no downtime.')).toBe(false);
    expect(okPP('The Sugar Plumb Express Facial is quick. It has no downtime, so you can go right back to your day.')).toBe(true);
    expect(okPP('The Sugar Plumb Express Facial has no downtime.')).toBe(true);
    expect(okPP('Jen will walk you through downtime at your visit.')).toBe(true);
  });
  it('blocks calling a paid consultation free or complimentary', () => {
    expect(okPP('Start with a complimentary consultation with Jen.')).toBe(false);
    expect(okPP('The consultation is free.')).toBe(false);
    expect(okPP('Start with a Skin Consultation, $40.')).toBe(true);
  });
  it("blocks words quoted in the spa's voice rules", () => {
    expect(pp.avoidWords()).toEqual(expect.arrayContaining(['painless', 'cheap', 'discount']));
    expect(okPP('Dermaplaning is painless and quick.')).toBe(false);
    expect(okPP('Our most affordable facial is the Sugar Plumb Express Facial at $85.')).toBe(true);
  });
});
