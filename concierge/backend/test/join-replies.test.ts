// A reply written before and after a tool call should reach the guest once (Plumb + Pine, Nov 9).
import { describe, expect, it } from 'vitest';
import { joinReplies } from '../src/orchestrator.ts';

describe('joinReplies', () => {
  it('keeps only the later wording when the model repeats itself around a tool call', () => {
    const before = 'Thinning hair can have many causes, so the best first step is a look at your hair and scalp with Jen, who specializes in scalp restoration.';
    const after = 'Thinning hair has many possible causes, so the best first step is a look at your hair and scalp with Jen, who specializes in scalp restoration.';
    expect(joinReplies([before, after])).toBe(after);
    const ask1 = "Thanks, Cameron! To finish your request, I'll need your last name and a phone number. Could you share those?";
    const ask2 = 'Thanks, Cameron! I still need your last name and a phone number to send the request. Could you share those?';
    expect(joinReplies([ask1, ask2])).toBe(ask2);
  });
  it('keeps parts that say different things', () => {
    const a = 'The Deluxe Hydrafacial deep-cleans and hydrates, with LED light therapy.';
    const b = 'Would you like to book online, or have Jen reach out?';
    expect(joinReplies([a, '', b])).toBe(`${a}\n\n${b}`);
  });
});
