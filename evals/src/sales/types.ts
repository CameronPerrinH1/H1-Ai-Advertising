// Shared shapes for the sales review, and how cards read in words.
import type { Card, Reply } from '@concierge/shared';
import type { Flag } from './checks.ts';
import type { Grade } from './grade.ts';
import type { Scenario } from './scenarios.ts';

export interface Turn {
  guest: string; // what the guest sent (or "[taps Confirm]")
  via: 'typed' | 'chip' | 'confirm';
  reply: Reply;
  ms: number; // time the guest waited for this reply
  modelCalls: number;
  fellBack?: boolean; // the safe fallback reply replaced the model's
  flags: Flag[];
}
export interface Run {
  scenario: Scenario;
  copy: number;
  turns: Turn[];
  flags: Flag[]; // conversation-level code checks
  grade?: Grade;
  error?: string;
}

// What the guest sees, in words: for the simulated guest, the grader and the report.
export function describeCards(cards: Card[]): string[] {
  return cards.map((c) => {
    switch (c.type) {
      case 'treatment_options':
        return `[Options card${c.headline ? ` "${c.headline}"` : ''}: ${c.items.map((i) => `${i.service.name} (${i.reason})`).join('; ')}]`;
      case 'service':
        return `[Service card: ${c.service.name}]`;
      case 'compare':
        return `[Comparison card: ${c.services.map((s) => s.name).join(' vs ')}]`;
      case 'booking_link':
        return `[Booking button${c.serviceName ? ` for ${c.serviceName}` : ''}${c.consult ? ' (consultation)' : ''}]`;
      case 'openings':
        return `[Openings card for ${c.serviceName}${c.consult ? ' (consultation first)' : ''}: ${c.days.map((d) => `${d.label} ${d.times.map((x) => x.label).join(', ')}`).join('; ')}; each time opens the booking page]`;
      case 'confirm':
        return `[Request card to review, with a Confirm button (${c.status})]`;
      case 'urgent':
        return `[Urgent help card: ${c.kind}]`;
      default:
        return `[${c.type.replace(/_/g, ' ')} card]`;
    }
  });
}

