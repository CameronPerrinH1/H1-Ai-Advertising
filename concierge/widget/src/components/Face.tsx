import type { PublicConfig } from '@concierge/shared';

// The wizard's avatar icons (apps/site-h1/src/onboarding/Avatar.tsx), drawn in white over the
// .avatar circle's brand gradient; details cut back out in the brand colour.
const ICON_ART: Record<string, string> = {
  sparkle: '<path d="M50 24 L55.5 44.5 L76 50 L55.5 55.5 L50 76 L44.5 55.5 L24 50 L44.5 44.5Z" fill="#fff"/><circle cx="70" cy="30" r="4" fill="#fff" opacity=".7"/>',
  bubble: '<path d="M27 35 Q27 28 34 28 L66 28 Q73 28 73 35 L73 57 Q73 64 66 64 L47 64 L36 74 L37.5 64 L34 64 Q27 64 27 57Z" fill="#fff"/><circle cx="40" cy="46" r="3" fill="var(--brand)"/><circle cx="50" cy="46" r="3" fill="var(--brand)"/><circle cx="60" cy="46" r="3" fill="var(--brand)"/>',
  leaf: '<path d="M28 72 Q27 32 72 27 Q73 68 28 72Z" fill="#fff"/><path d="M31 69 Q48 52 62 38" stroke="var(--brand)" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
  droplet: '<path d="M50 22 C50 22 30 46 30 60 A20 20 0 0 0 70 60 C70 46 50 22 50 22Z" fill="#fff"/><path d="M40 60 A10 10 0 0 0 48 70" stroke="var(--brand)" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
  syringe: '<g transform="rotate(-45 50 50)" fill="#fff"><rect x="32" y="44" width="28" height="12" rx="2"/><rect x="59" y="39" width="3" height="22" rx="1.5"/><rect x="62" y="48" width="10" height="4"/><rect x="72" y="42" width="4" height="16" rx="1.5"/><rect x="26" y="47" width="6" height="6" rx="1"/><rect x="14" y="49.2" width="13" height="1.6"/><g fill="var(--brand)"><rect x="38" y="44" width="1.6" height="5"/><rect x="44" y="44" width="1.6" height="5"/><rect x="50" y="44" width="1.6" height="5"/></g></g>',
  serum: '<g fill="#fff"><ellipse cx="50" cy="27" rx="6" ry="8"/><rect x="42" y="34" width="16" height="9" rx="1.5"/><rect x="35" y="45" width="30" height="32" rx="7"/></g><rect x="41" y="55" width="18" height="12" rx="2" fill="var(--brand)"/>',
  jar: '<g fill="#fff"><rect x="30" y="32" width="40" height="11" rx="3"/><rect x="27" y="46" width="46" height="24" rx="6"/></g><rect x="38" y="55" width="24" height="3" rx="1.5" fill="var(--brand)"/>',
};

// What fills an .avatar circle: the coordinator's portrait or icon when it has one (D45), else its initial.
// The AI label sits beside the name in the header wherever the chat is open.
export function Face({ c }: { c: PublicConfig['concierge'] }) {
  if (c.avatarUrl) return <img src={c.avatarUrl} alt="" width={72} height={72} />;
  const art = c.avatarIcon && ICON_ART[c.avatarIcon];
  if (art) return <svg class="avatar-icon" viewBox="0 0 100 100" aria-hidden="true" dangerouslySetInnerHTML={{ __html: art }} />;
  return <>{c.initials}</>;
}
