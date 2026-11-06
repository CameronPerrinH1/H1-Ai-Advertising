import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';
import { createHmac } from 'node:crypto';

// Returns the number in E.164 form if it's valid for one of the allowed countries.
export function normalizePhone(input: string, countries: string[]): string | null {
  const defaultCountry = (countries[0] ?? 'US') as CountryCode;
  const parsed = parsePhoneNumberFromString(input, defaultCountry);
  if (!parsed || !parsed.isValid()) return null;
  if (parsed.country && !countries.includes(parsed.country)) return null;
  return parsed.number;
}

export function formatPhone(e164: string): string {
  return parsePhoneNumberFromString(e164)?.formatNational() ?? e164;
}

// Keyed hash so limits and deletion requests can find a phone without storing it (6.3, 7.2).
export function phoneHash(e164: string, key: string): string {
  return createHmac('sha256', key).update(e164).digest('hex');
}
