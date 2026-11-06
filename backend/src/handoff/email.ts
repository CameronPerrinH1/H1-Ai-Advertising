// Handoff emails (D36, D61). Generic subject; only the fields staff need; no conversation text.
// Local development writes them to .outbox/; stage B sends through SES with TLS required.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import type { Catalog } from '../catalog.ts';
import { formatPhone } from '../safety/phone.ts';
import { strings } from '../i18n.ts';
import type { AppointmentPayload, CallbackPayload } from '../session/store.ts';

export interface Email {
  from: string;
  to: string;
  subject: string;
  body: string;
}

export interface Outbox {
  send(email: Email): Promise<string>;
}

const FOOTER = 'Sent by your website concierge. Conversation details are not included.';

export function appointmentEmail(catalog: Catalog, p: AppointmentPayload): Email {
  const provider = p.staffId ? catalog.providers.get(p.staffId) : undefined;
  const treatments = p.serviceIds.map((id) => {
    const consult = catalog.consultFor(id);
    return `${catalog.services.get(id)?.name ?? id}${consult ? ` (needs the ${consult.name} first)` : ''}`;
  });
  const lines = [
    'New appointment request from your website. Please book it and confirm with the guest.',
    '',
    `${treatments.length > 1 ? 'Treatments' : 'Treatment'}: ${treatments.join('; ')}`,
    `Provider: ${provider?.name ?? strings('en').anyProvider}`,
    `Preferred times: ${p.preferredTimes}`,
    `Name: ${p.firstName} ${p.lastName}`,
    `Phone: ${formatPhone(p.phone)}`,
    ...(p.email ? [`Email: ${p.email}`] : []),
    '',
    FOOTER,
  ];
  return { from: catalog.config.handoff.email_from, to: catalog.config.handoff.email_to, subject: 'New appointment request from your website', body: lines.join('\n') };
}

export function callbackEmail(catalog: Catalog, p: CallbackPayload): Email {
  const minimal = !catalog.config.handoff.email_provider_baa_confirmed;
  const lines = [
    'New callback request from your website.',
    '',
    `Name: ${p.firstName}`,
    `Phone: ${formatPhone(p.phone)}`,
    ...(p.preferredTime ? [`Best time: ${p.preferredTime}`] : []),
    // Without a BAA-covered inbox, the reason is left out (D36).
    ...(minimal ? [] : [`Reason: ${strings('en').categories[p.category] ?? p.category}`]),
    '',
    FOOTER,
  ];
  return { from: catalog.config.handoff.email_from, to: catalog.config.handoff.email_to, subject: 'New callback request from your website', body: lines.join('\n') };
}

export class FileOutbox implements Outbox {
  constructor(private dir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../.outbox')) {}

  async send(email: Email): Promise<string> {
    mkdirSync(this.dir, { recursive: true });
    const id = randomUUID();
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const text = [`From: ${email.from}`, `To: ${email.to}`, `Subject: ${email.subject}`, '', email.body, ''].join('\n');
    writeFileSync(join(this.dir, `${stamp}-${id.slice(0, 8)}.txt`), text, { mode: 0o600 });
    return id;
  }
}

export class MemoryOutbox implements Outbox {
  readonly sent: Email[] = [];
  async send(email: Email): Promise<string> {
    this.sent.push(email);
    return randomUUID();
  }
}
