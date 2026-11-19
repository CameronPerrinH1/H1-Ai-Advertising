// One-person businesses (Cameron, Nov 19): when one provider does everything, the chat names her
// ("Jen will text you to confirm") instead of "our team", "our estheticians", or "your provider".
// Catalog.solo decides whether a spa is solo; this file only rewrites wording.

// Not "front desk": a solo studio truthfully says it has none ("There's no front desk; Jen will let you in").
const ROLES = '(?:estheticians?|aestheticians?|providers?|injectors?|nurses?|team members?|staff|manager)';

// Order matters: the longer phrases first, so "someone from our clinical team" becomes one name.
const RULES: [RegExp, (name: string) => string][] = [
  [/\bsomeone (?:from|on) (?:our|the) (?:clinical |medical )?team\b/gi, (n) => n],
  [new RegExp(`\\bone of our ${ROLES}\\b`, 'gi'), (n) => n],
  [/\ba provider assessment\b/gi, (n) => `an assessment by ${n}`],
  [/\b(?:our|the) (?:clinical |medical )?team\b/gi, (n) => n],
  [new RegExp(`\\b(?:our|the) ${ROLES}\\b`, 'gi'), (n) => n],
  [/\byour (?:esthetician|aesthetician|provider|injector)\b/gi, (n) => n],
  [/\ba provider\b/gi, (n) => n],
  [/\bsomeone(?= (?:to )?(?:reach out|follow up|call|contact|get back))/gi, (n) => n],
  [/\bthem(?= (?:to )?(?:reach out|follow up|call|contact|get back))/gi, (n) => n],
  [/\bthey(?:’|')ll (?=reach out|follow up|call|contact|get back|be in touch)/gi, (n) => `${n} will `],
  [/\bthey will (?=reach out|follow up|call|contact|get back|be in touch)/gi, (n) => `${n} will `],
  // Spanish card text (i18n.ts): "El equipo te llamará", "una consulta con tu proveedor".
  [/\b(?:el|nuestro) equipo\b/gi, (n) => n],
  [/\btu proveedor\b/gi, (n) => n],
];

/** Rewrites team wording to the owner's name, and fixes the verb that followed a plural ("Jen are" → "Jen is"). */
export function soloize(text: string, name: string): string {
  let out = text;
  for (const [re, to] of RULES) out = out.replace(re, () => to(name));
  const n = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return out
    .replace(new RegExp(`\\b${n} are\\b`, 'g'), `${name} is`)
    .replace(new RegExp(`\\b${n} have\\b`, 'g'), `${name} has`)
    .replace(new RegExp(`\\b${n} were\\b`, 'g'), `${name} was`)
    .replace(new RegExp(`\\b${n}(?:’|')s ${n}\\b`, 'g'), name)
    // A plural possessive ("our providers’ training") becomes "Jen’s training".
    .replace(new RegExp(`\\b${n}’(?= [a-z])`, 'g'), `${name}’s`);
}

/** Team wording a solo business's chat must not say to a guest (English and Spanish). */
export const TEAM_TALK = new RegExp(
  `\\b(?:our|the) (?:clinical |medical )?team\\b|\\b(?:our|the) ${ROLES}\\b|\\bone of our\\b|\\bsomeone (?:from|on) (?:our|the)\\b|\\byour (?:esthetician|aesthetician|provider|injector)\\b|\\b(?:nuestro|el) equipo\\b`,
  'i',
);

/** The rule at the top of a solo business's prompt. Added after soloize, which would rewrite its examples. */
export function soloRule(business: string, fullName: string, name: string): string[] {
  return [
    '# A one-person business',
    `- ${business} is run by one person: ${fullName} does every treatment, answers every message, and returns every call. There is no team, front desk, or other staff.`,
    `- Wherever you'd say "our team", "the team", "our estheticians", "your provider", or "someone", say ${name}: "${name} will text you to confirm", "I can have ${name} call you", "${name} will go over that at your consultation".`,
  ];
}
