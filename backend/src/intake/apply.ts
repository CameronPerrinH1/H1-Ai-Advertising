// Applies an approved intake playbook to a client folder (09-intake-wizard.md, Section 5).
//
// The folder already holds H1's business facts: the price list (services.yaml, products.yaml),
// service details, providers, FAQs, hours, links, branding, and compliance settings. The playbook
// owns the spa's voice and Sales Playbook, and replaces only those parts:
//   config.yaml    concierge name, label, avatar, greeting; terminology; voice; languages;
//                  sales (featured, do_not_promote, pricing, pairings, add-on suggestions,
//                  promotions, events, growth, tactics); handoff wording; the urgent line;
//                  the approvals (compliance_profile)
//   objections.yaml, concerns.yaml, voice-examples.md          rewritten
//   products.yaml          priority, pairings, and concerns added to H1's prices
//   service-details.yaml   requires_assessment for "consult first" treatments
//   urgent-message.yaml    the medical director's messages and symptom lists
//   intake-playbook.json   the playbook itself, as approved
//
// Anything the playbook names that the folder doesn't have (a treatment or product without a price,
// a promotion without a discount) is an error to fix before importing; anything it can't use is a
// warning. Pure apart from reading the folder: returns the files to write.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse, parseDocument, stringify, type Document } from 'yaml';
import type { Playbook } from './playbook.ts';

export class PlaybookError extends Error {}

export interface ImportResult {
  files: Record<string, string>;
  warnings: string[];
}

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const lower = (s: string) => s.trim().toLowerCase();
const slug = (s: string) => lower(s).normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const pad = (n: number) => String(n).padStart(2, '0');
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

// "We never guarantee results" → "Never guarantee results"
const neverRule = (s: string) => {
  const t = s.trim().replace(/[.]$/, '').replace(/^we never\s+/i, 'never ');
  return t.charAt(0).toUpperCase() + t.slice(1);
};

// The discount in a promotion's terms: "20% off any HydraFacial", "$50 off Botox".
export function parseDiscount(terms: string): { percent_off: number } | { amount_off: number } | undefined {
  const pct = terms.match(/(\d+(?:\.\d+)?)\s?(?:%|percent\b)/i);
  if (pct) return { percent_off: Number(pct[1]) };
  const amt = terms.match(/\$\s?(\d+(?:\.\d{1,2})?)\s*off\b/i) ?? terms.match(/\b(\d+(?:\.\d{1,2})?)\s*dollars?\s+off\b/i);
  if (amt) return { amount_off: Number(amt[1]) };
  return undefined;
}

// The next run of a yearly promotion (months, possibly across New Year) that hasn't ended by `today`.
export function yearlyWindow(startMonth: number, endMonth: number, today: string): { starts: string; ends: string } {
  const y = Number(today.slice(0, 4));
  for (const year of [y - 1, y, y + 1]) {
    const endYear = endMonth < startMonth ? year + 1 : year;
    const window = { starts: `${year}-${pad(startMonth)}-01`, ends: `${endYear}-${pad(endMonth)}-${pad(lastDay(endYear, endMonth))}` };
    if (window.ends >= today) return window;
  }
  throw new Error('unreachable');
}

export function applyPlaybook(pb: Playbook, clientDir: string): ImportResult {
  const read = (f: string) => readFileSync(join(clientDir, f), 'utf8');
  const problems: string[] = [];
  const warnings: string[] = [];
  const config = parseDocument(read('config.yaml'));
  const base = config.toJS() as Json;
  const set = (doc: Document, path: (string | number)[], value: unknown) => doc.setIn(path, doc.createNode(value));
  const hasEs = pb.languages.includes('es');

  // English text the spa approved. When it changes, an older Spanish translation no longer matches it.
  const english = (doc: Document, path: (string | number)[], value: string, what: string) => {
    const current = doc.getIn(path) as unknown;
    const js = (current && typeof current === 'object' && 'toJSON' in current ? (current as { toJSON(): Json }).toJSON() : current) as Json | string | undefined;
    if (js && typeof js === 'object' && js.en === value) return;
    set(doc, path, { en: value });
    if (js && typeof js === 'object' && js.es && hasEs) warnings.push(`${what}: the English changed, so add the Spanish again before Spanish goes live (D47).`);
  };

  // Treatments by name, matched to the price list.
  const services = (parse(read(base.knowledge.services_file)) as Json) ?? { services: [], add_ons: [] };
  const byName = new Map<string, string>();
  for (const s of services.services) {
    byName.set(lower(s.name), s.id);
    byName.set(s.id, s.id);
  }
  const serviceId = (name: string) => byName.get(lower(name)) ?? byName.get(slug(name));
  const ids = (list: string[], where: string) =>
    list.flatMap((n) => {
      const id = serviceId(n);
      if (!id) problems.push(`${where}: "${n}" isn't on the price list (${base.knowledge.services_file}). Add it with its price and duration, then import again.`);
      return id ? [id] : [];
    });
  for (const s of pb.services) ids([s.name], 'Treatments');
  const reviewed = new Set(pb.services.flatMap((s) => serviceId(s.name) ?? []));
  for (const s of services.services) {
    if (!reviewed.has(s.id) && !/consult/.test(s.id)) warnings.push(`${s.name} is on the price list but not in the playbook, so the spa didn't set its priority or pricing.`);
  }

  // Identity. A new name also changes the chat notice, which guests then see again (D35).
  const oldName: string = base.concierge.name;
  set(config, ['concierge', 'name'], pb.identity.name);
  set(config, ['concierge', 'avatar'], pb.identity.avatar.id ? pb.identity.avatar : { mode: pb.identity.avatar.mode });
  english(config, ['concierge', 'greeting'], pb.identity.greeting, 'The greeting');
  english(config, ['concierge', 'disclosure_label'], pb.identity.label, 'The AI label');
  if (oldName !== pb.identity.name) {
    const swap = (t: string) => t.replace(new RegExp(`\\b${oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'), pb.identity.name);
    const notice = base.concierge.chat_notice as Json;
    const version = `${pb.exportedOn}.1`;
    set(config, ['concierge', 'chat_notice'], { ...notice, version: notice.version === version ? `${pb.exportedOn}.2` : version, en: swap(notice.en), ...(notice.es ? { es: swap(notice.es) } : {}) });
    const staff = base.staff_mode?.suggested as Json | undefined;
    if (staff) set(config, ['staff_mode', 'suggested'], Object.fromEntries(Object.entries(staff).map(([k, v]) => [k, (v as string[]).map(swap)])));
    warnings.push(`The chat notice now names ${pb.identity.name} (it named ${oldName}); its version changed, so returning guests see it again.`);
  }

  set(config, ['business', 'terminology'], { clients: pb.terminology.guests, services: pb.terminology.treatments, providers: pb.terminology.providers, booking: pb.terminology.booking });
  set(config, ['voice'], {
    tone: pb.voice.tone,
    dos: pb.voice.dos,
    donts: pb.voice.neverSay.map(neverRule),
    examples_file: 'voice-examples.md',
    emoji: pb.voice.emoji,
    exclamation: pb.voice.exclamation,
    length: pb.voice.length,
    ...(pb.voice.signOff ? { sign_off: pb.voice.signOff } : {}),
  });
  set(config, ['languages'], pb.languages);

  // The Sales Playbook.
  const hidden = new Set(pb.services.filter((s) => s.priority === 'none').flatMap((s) => serviceId(s.name) ?? []));
  const pricing: Record<string, string> = {};
  const pairings: Record<string, string[]> = {};
  const addOns: Record<string, string[]> = {};
  for (const s of pb.services) {
    const id = serviceId(s.name);
    if (!id) continue;
    if (s.price) pricing[id] = s.price;
    const pairs = ids(s.pairsWith, `${s.name}: pairs with`).filter((p) => p !== id && !hidden.has(p));
    for (const n of s.pairsWith) if (hidden.has(serviceId(n) ?? '')) warnings.push(`${s.name}: left out the pairing with ${n}, which the spa doesn't promote.`);
    if (pairs.length) pairings[id] = pairs;
    for (const up of s.upgrades) {
      const match = (services.add_ons as Json[]).find((a) => lower(a.name).includes(lower(up)) || lower(up).includes(lower(a.name)));
      if (match) (addOns[id] ??= []).push(match.id);
      else warnings.push(`${s.name}: the upgrade "${up}" isn't an add-on on the price list, so it was left out.`);
    }
  }
  set(config, ['sales', 'featured_services'], pb.services.filter((s) => s.priority === 'high').flatMap((s) => serviceId(s.name) ?? []));
  set(config, ['sales', 'do_not_promote'], pb.services.filter((s) => s.priority === 'none').flatMap((s) => serviceId(s.name) ?? []));
  set(config, ['sales', 'pricing'], { default: pb.pricing, services: pricing });
  set(config, ['sales', 'pairings'], pairings);
  set(config, ['sales', 'add_on_suggestions'], addOns);
  set(config, ['sales', 'growth'], {
    packages: pb.growth.packages,
    differentiators: pb.growth.differentiators,
    ...(pb.growth.inTheirWords ? { in_their_words: pb.growth.inTheirWords } : {}),
  });

  const eventKeys = new Set(pb.events.map((e) => e.key));
  set(
    config,
    ['sales', 'events'],
    pb.events.map((e) => ({
      id: e.key,
      name: e.name,
      ...(e.date ? { date: e.date } : { month: e.month }),
      ...(e.time ? { time: e.time } : {}),
      ...(e.location ? { location: e.location } : {}),
      description: e.description,
      audience: e.audience,
      rsvp: e.rsvp,
      ...(e.rsvp === 'link' && e.link ? { rsvp_link: e.link } : {}),
    })),
  );

  // Promotions apply to treatments; a wizard category or "All services" stands for its treatments.
  const allIds = services.services.map((s: Json) => s.id as string);
  const kept = new Set<string>();
  const promotions = pb.promotions.flatMap((p) => {
    const discount = parseDiscount(p.terms);
    if (!discount) {
      problems.push(`Promotion "${p.name}": its terms ("${p.terms}") need a percent or dollar amount off, like "20% off" or "$50 off".`);
      return [];
    }
    let applies: string[] = p.everything ? allIds : [];
    for (const name of p.services) {
      const id = serviceId(name);
      if (id) applies.push(id);
      else if (lower(name) === 'all services') applies = allIds;
      else if (pb.services.some((s) => lower(s.category) === lower(name))) applies.push(...pb.services.filter((s) => lower(s.category) === lower(name)).flatMap((s) => serviceId(s.name) ?? []));
      else warnings.push(`Promotion "${p.name}": "${name}" isn't a treatment (offers on products aren't in the chat yet), so it was left out.`);
    }
    applies = [...new Set(applies)];
    if (!applies.length) {
      warnings.push(`Promotion "${p.name}" applies to no treatment on the price list, so it was left out.`);
      return [];
    }
    // Evergreen: on from the export date, with no end.
    const dates: { starts: string; ends?: string } = p.evergreen ? { starts: pb.exportedOn }
      : p.starts && p.ends ? { starts: p.starts, ends: p.ends } : yearlyWindow(p.startMonth!, p.endMonth!, pb.exportedOn);
    if (dates.ends && dates.ends < pb.exportedOn) {
      warnings.push(`Promotion "${p.name}" ended on ${dates.ends}, so it was left out.`);
      return [];
    }
    if (p.event && !eventKeys.has(p.event)) problems.push(`Promotion "${p.name}": unknown event ${p.event}.`);
    kept.add(p.key);
    return [{ id: p.key, description: `${p.name}: ${p.terms}`, services: applies, ...(p.event ? { event: p.event } : {}), ...(p.eligibility ? { eligibility: p.eligibility } : {}), ...discount, ...dates, third_party_funded: false }];
  });
  set(config, ['sales', 'promotions'], promotions);

  const t = pb.tactics;
  const hesitation = t.promotions === 'on_hesitation' && t.hesitationPromotion && kept.has(t.hesitationPromotion) ? t.hesitationPromotion : undefined;
  if (t.promotions === 'on_hesitation' && !hesitation) warnings.push('The promotion to offer when a guest hesitates was left out, so promotions are mentioned only when asked.');
  set(config, ['sales', 'tactics'], {
    promotions: t.promotions === 'on_hesitation' && !hesitation ? 'when_asked' : t.promotions,
    ...(hesitation ? { hesitation_promotion: hesitation } : {}),
    offer_contact: t.offerContact,
    suggest_booking: t.suggestBooking,
    urgency: t.urgency,
  });

  set(config, ['handoff', 'wording'], pb.handoff);
  set(config, ['business', 'urgent_line'], pb.urgent.line);
  if (pb.urgent.hours) set(config, ['knowledge', 'policies', 'urgent_line'], `The urgent line is answered ${pb.urgent.hours}.${pb.urgent.afterHours ? ` ${pb.urgent.afterHours}` : ''}`);
  set(config, ['knowledge', 'objections_file'], 'objections.yaml');
  set(config, ['knowledge', 'concerns_file'], 'concerns.yaml');
  set(config, ['knowledge', 'products_file'], base.knowledge.products_file ?? 'products.yaml');

  // Approvals (D74, D83): who approved exactly these answers.
  const approval = (role: 'owner' | 'md') => {
    const a = pb.approvals.find((x) => x.role === role);
    return a ? { approver: `${a.name}, ${a.credential}`, approved_on: a.approvedOn, content_hash: pb.contentHash } : { approver: null, approved_on: null, content_hash: null };
  };
  // With no medical director (an esthetician's studio), the spa's own sign-off covers the
  // medical and safety sections too (Cameron, Nov 9): its attestation includes them.
  const md = pb.approvals.some((x) => x.role === 'md') ? approval('md') : approval('owner');
  set(config, ['compliance_profile', 'medical_director_approval'], md);
  set(config, ['compliance_profile', 'owner_approval'], approval('owner'));
  if (!pb.approvals.length) warnings.push('Draft: the playbook is not signed off. It must not go live until the spa signs off on it.');

  // Consult first: an assessment, and the consultation as a prerequisite where the price list has one.
  const details = parseDocument(read(base.knowledge.service_details_file));
  const consultation = services.services.find((s: Json) => /consult/.test(s.id))?.id as string | undefined;
  const prereqs = [...((base.booking.rules.prerequisites ?? []) as Json[])];
  for (const s of pb.services) {
    const id = serviceId(s.name);
    if (!id) continue;
    const assessed = details.getIn([id, 'requires_assessment']) === true;
    if (s.consultFirst) {
      details.setIn([id, 'requires_assessment'], true);
      if (consultation && id !== consultation && !prereqs.some((p) => p.service === id)) prereqs.push({ service: id, requires: consultation });
      if (!consultation) warnings.push(`${s.name} needs a consult first, but the price list has no consultation to book.`);
    } else if (assessed) {
      warnings.push(`${s.name}: the spa didn't mark "consult first", but its service details require an assessment; kept as is.`);
    }
  }
  set(config, ['booking', 'rules', 'prerequisites'], prereqs);

  // Concerns, pregnancy, products.
  const concerns = {
    concerns: pb.concerns.map((c) => ({ name: c.name, services: ids(c.services, `Concern "${c.name}"`), otherwise: c.otherwise })),
    pregnancy: { services: ids(pb.pregnancy.services, 'Pregnancy and nursing'), otherwise: pb.pregnancy.otherwise },
  };
  const concernNames = new Set(pb.concerns.map((c) => lower(c.name)));
  const priced = (base.knowledge.products_file ? ((parse(read(base.knowledge.products_file)) as Json)?.products ?? []) : []) as Json[];
  const used = new Set<Json>();
  const products = pb.products.flatMap((p) => {
    const match = priced.find((x) => lower(x.name) === lower(p.name) || lower(x.name) === lower(`${p.brand} ${p.name}`));
    if (!match) {
      problems.push(`Product "${p.brand ? `${p.brand} ` : ''}${p.name}" isn't on the retail price list (products.yaml). Add it with its price, then import again.`);
      return [];
    }
    used.add(match);
    const helps = p.helpsWith.filter((c) => concernNames.has(lower(c)));
    return [{
      name: match.name,
      price: match.price,
      ...(match.note ? { note: match.note } : {}),
      ...(p.brand ? { brand: p.brand } : {}),
      ...(p.category ? { category: p.category } : {}),
      priority: p.priority,
      after_services: ids(p.after, `Product "${p.name}": suggested after`),
      helps_with: helps,
      sold: p.sold,
    }];
  });
  for (const x of priced) {
    if (!used.has(x)) {
      warnings.push(`Product "${x.name}" is on the price list but not in the playbook; kept as is.`);
      products.push(x as (typeof products)[number]);
    }
  }

  // The medical director's urgent messages and symptoms (D14, D74).
  const urgent = parseDocument(read(base.knowledge.urgent_message_file));
  // The medical director's approval when there is one; otherwise the spa's sign-off, which covers the urgent lines too.
  const signer = pb.approvals.find((a) => a.role === 'md') ?? pb.approvals[0];
  set(urgent, ['approved_by'], signer ? `${signer.name}, ${signer.credential}, ${signer.approvedOn} (intake ${pb.contentHash.slice(0, 12)})` : 'NOT APPROVED: draft intake export');
  english(urgent, ['emergency', 'body'], pb.urgent.emergencyMessage, 'The emergency message');
  english(urgent, ['post_treatment', 'body'], pb.urgent.urgentMessage, 'The urgent message');
  set(urgent, ['emergency_symptoms'], pb.urgent.emergencySymptoms);
  set(urgent, ['urgent_symptoms'], pb.urgent.urgentSymptoms);

  // Voice examples: tone samples only (09 §4.2). The export already swapped facts for placeholders.
  const examples = pb.voice.examples.map((e) => (e.guest ? `> To "${e.guest}": "${e.reply}"` : `> "${e.reply}"`));
  for (const e of pb.voice.examples) if (/\$\s?\d/.test(e.reply)) problems.push(`A voice example still has a price in it: "${e.reply}"`);

  if (problems.length) throw new PlaybookError(problems.join('\n'));

  const header = (what: string) => `# ${what}. From the intake playbook ${pb.contentHash.slice(0, 12)} (${pb.exportedOn}); edit in the wizard, not here.\n`;
  return {
    files: {
      'config.yaml': config.toString(),
      [base.knowledge.service_details_file]: details.toString(),
      [base.knowledge.urgent_message_file]: urgent.toString(),
      'objections.yaml': header('Approved answers to common hesitations') + stringify({ objections: pb.objections }),
      'concerns.yaml': header('Concerns guests describe, and the treatments to lead with') + stringify(concerns),
      [base.knowledge.products_file ?? 'products.yaml']: header('Retail products: prices from H1\'s price list, the rest from the spa') + stringify({ products }),
      'voice-examples.md': `# Voice examples\n\nTone samples from ${pb.spa.name}'s team, never facts: prices, dates, times, and offers are placeholders (09-intake-wizard.md, Section 4.2). From the intake playbook ${pb.contentHash.slice(0, 12)}.\n\n${examples.join('\n\n')}\n`,
      'intake-playbook.json': `${JSON.stringify(pb, null, 2)}\n`,
    },
    warnings,
  };
}
