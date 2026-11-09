// Quick replies are sent as if the guest typed them, so they never invent the guest's details.
import { describe, expect, it } from 'vitest';
import { speaksForGuest } from '../src/tools/handlers.ts';

describe('quick-reply chips', () => {
  it('drops chips that state something only the guest knows', () => {
    for (const r of ['My last name is Lee', 'My name is Sam', 'My number is 775-555-0100', 'jen@example.com', "I'm 34", "I'm pregnant", 'Mi apellido es Lee'])
      expect(speaksForGuest(r), r).toBe(true);
  });
  it('keeps ordinary next steps', () => {
    for (const r of ["I'd rather get a callback", 'Book a consultation', 'What does it cost?', 'Tell me about Jen', 'Is there downtime?', "I'm nervous about pain"])
      expect(speaksForGuest(r), r).toBe(false);
  });
});
