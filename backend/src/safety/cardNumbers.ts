// Removes payment card numbers before the model call, storage, or logging (D33).

const CANDIDATE = /(?<!\d)(?:\d[ -]?){12,18}\d(?!\d)/g;
export const CARD_MARKER = '[card number removed]';

export function luhnValid(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

export function containsCardNumber(text: string): boolean {
  for (const m of text.matchAll(CANDIDATE)) {
    const digits = m[0].replace(/\D/g, '');
    if (digits.length >= 13 && digits.length <= 19 && luhnValid(digits)) return true;
  }
  return false;
}

export function redactCardNumbers(text: string): { text: string; redacted: boolean } {
  let redacted = false;
  const out = text.replace(CANDIDATE, (match) => {
    const digits = match.replace(/\D/g, '');
    if (digits.length >= 13 && digits.length <= 19 && luhnValid(digits)) {
      redacted = true;
      return CARD_MARKER;
    }
    return match;
  });
  return { text: out, redacted };
}
