import { describe, expect, it } from 'vitest';
import { CARD_MARKER, redactCardNumbers } from '../src/safety/cardNumbers.ts';
import { detectSafetyNet } from '../src/safety/emergency.ts';
import { formatPhone, normalizePhone, phoneHash } from '../src/safety/phone.ts';

describe('card numbers (D33)', () => {
  it('removes Luhn-valid card numbers in any spacing', () => {
    expect(redactCardNumbers('my card is 4111 1111 1111 1111 thanks').text).toBe(`my card is ${CARD_MARKER} thanks`);
    expect(redactCardNumbers('4111-1111-1111-1111').redacted).toBe(true);
    expect(redactCardNumbers('378282246310005').redacted).toBe(true); // Amex
  });

  it('leaves phone numbers and non-card digits alone', () => {
    expect(redactCardNumbers('call me at 503-555-0142').redacted).toBe(false);
    expect(redactCardNumbers('order 1234 5678 9012 3456').redacted).toBe(false); // fails Luhn
  });
});

describe('safety net (D14)', () => {
  it('detects crisis messages in English and Spanish', () => {
    expect(detectSafetyNet("honestly I don't want to live anymore")).toBe('crisis');
    expect(detectSafetyNet('I keep thinking about suicide')).toBe('crisis');
    expect(detectSafetyNet('a veces quiero morir')).toBe('crisis');
  });

  it('detects emergencies', () => {
    expect(detectSafetyNet("my lips are swelling and I can't breathe")).toBe('emergency');
    expect(detectSafetyNet("I'm losing my vision after filler")).toBe('emergency');
    expect(detectSafetyNet('no puedo respirar')).toBe('emergency');
  });

  it('stays quiet for ordinary questions', () => {
    expect(detectSafetyNet('How much is a HydraFacial?')).toBeNull();
    expect(detectSafetyNet('Is there downtime after a peel?')).toBeNull();
  });
});

describe('phone numbers', () => {
  it('normalizes valid US numbers and rejects invalid ones', () => {
    expect(normalizePhone('(503) 555-0142', ['US'])).toBe('+15035550142');
    expect(normalizePhone('12345', ['US'])).toBeNull();
    expect(normalizePhone('+44 20 7946 0958', ['US'])).toBeNull();
  });

  it('formats for display and hashes with a key', () => {
    expect(formatPhone('+15035550142')).toBe('(503) 555-0142');
    expect(phoneHash('+15035550142', 'k1')).not.toBe(phoneHash('+15035550142', 'k2'));
  });
});
