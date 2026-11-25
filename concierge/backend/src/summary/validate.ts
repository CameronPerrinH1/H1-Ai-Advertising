// Free text in a summary must read like a generic FAQ (D32): no contact details, dates,
// first-person words, or health details. Same rules as the schema's generic_text, plus a
// health-term blocklist.
const REJECT = [
  /@/,
  /\d{3}\D{0,2}\d{3}\D{0,2}\d{4}/, // phone
  /\d{1,2}\/\d{1,2}/, // numeric date
  /\b([Ii]|[Mm][Ee]|[Mm][Yy]|[Mm][Ii][Nn][Ee])\b/, // first person pushes toward generic wording
  /pregnan|breastfeed|nursing|medication|diagnos|allerg|blood thinner|diabet|cancer|surgery|infection|prescription|disorder|embaraz|lactan|medicament/i,
];

export function genericTextOk(text: string): boolean {
  const t = text.trim();
  return t.length >= 3 && t.length <= 100 && !REJECT.some((r) => r.test(t));
}
