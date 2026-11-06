import type { PublicConfig } from '@concierge/shared';

// What fills an .avatar circle: the coordinator's portrait when it has one (D45), else its initial.
// The AI label sits beside the name in the header wherever the chat is open.
export function Face({ c }: { c: PublicConfig['concierge'] }) {
  return c.avatarUrl ? <img src={c.avatarUrl} alt="" width={72} height={72} /> : <>{c.initials}</>;
}
