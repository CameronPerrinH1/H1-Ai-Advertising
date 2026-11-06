// Keyword safety net (D14): catches emergencies and crisis messages even if the model misses them.
// False positives are acceptable; the cost is showing help numbers to someone who didn't need them.

const CRISIS = [
  /\bsuicid/i,
  /\bkill (?:my ?self|me)\b/i,
  /\bend (?:my|it all|my own) ?life\b/i,
  /\bwant(?:s|ed)? to die\b/i,
  /\bdon'?t want to (?:live|be alive|be here)\b/i,
  /\b(?:hurt|harm|cut)(?:ing)? my ?self\b/i,
  /\bself[- ]?harm/i,
  /\bmatarme\b/i,
  /\bquitarme la vida\b/i,
  /\bquiero morir/i,
  /\bno quiero vivir/i,
  /\bhacerme daño\b/i,
];

const EMERGENCY = [
  /\b(?:can'?t|cannot|can not|trouble|difficulty|hard to) breath/i,
  /\bthroat (?:is )?(?:closing|swelling)/i,
  /\bchest pain/i,
  /\b(?:losing|lost|loss of) (?:my )?(?:vision|sight)\b/i,
  /\bvision loss\b/i,
  /\bcan'?t see\b/i,
  /\b(?:fainted|passed out|unconscious)\b/i,
  /\banaphyla/i,
  /\bno puedo respirar/i,
  /\bdolor (?:en el|de) pecho/i,
  /\b(?:perd[ií]|perdiendo) la vista/i,
  /\bno puedo ver\b/i,
  /\bme desmay[eé]/i,
];

export type SafetyNetKind = 'crisis' | 'emergency';

const normalize = (s: string) => ` ${s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()} `;

// extraEmergency: the spa's own emergency symptoms (urgent-message.yaml, approved by its medical
// director), matched as whole phrases. They only add to the built-in patterns, never replace them.
export function detectSafetyNet(text: string, extraEmergency: readonly string[] = []): SafetyNetKind | null {
  if (CRISIS.some((r) => r.test(text))) return 'crisis';
  if (EMERGENCY.some((r) => r.test(text))) return 'emergency';
  const t = normalize(text);
  if (extraEmergency.some((p) => normalize(p).trim().length >= 4 && t.includes(normalize(p)))) return 'emergency';
  return null;
}
