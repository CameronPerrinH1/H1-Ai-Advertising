// Loads and validates one client's folder: config.yaml plus the knowledge files it names.
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import type { z } from 'zod';
import {
  configSchema,
  servicesFileSchema,
  serviceDetailsSchema,
  providersFileSchema,
  faqsFileSchema,
  objectionsFileSchema,
  fitRulesFileSchema,
  productsFileSchema,
  concernsFileSchema,
  urgentFileSchema,
  type ClientConfig,
  type UrgentMessages,
} from './schema.ts';

export const CLIENTS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../clients');

export interface ClientBundle {
  config: ClientConfig;
  services: z.infer<typeof servicesFileSchema>;
  details: z.infer<typeof serviceDetailsSchema>;
  providers: z.infer<typeof providersFileSchema>['providers'];
  faqs: z.infer<typeof faqsFileSchema>['faqs'];
  objections: z.infer<typeof objectionsFileSchema>['objections'];
  fitRules: z.infer<typeof fitRulesFileSchema>['fit_rules'];
  products: z.infer<typeof productsFileSchema>['products'];
  concerns: z.infer<typeof concernsFileSchema>;
  urgent: UrgentMessages;
  voiceExamples: string;
}

export class ConfigError extends Error {}

function readYaml<T>(dir: string, file: string, schema: z.ZodType<T, unknown>): T {
  const path = join(dir, file);
  if (!existsSync(path)) throw new ConfigError(`${file}: file not found`);
  const parsed = schema.safeParse(parse(readFileSync(path, 'utf8')));
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ');
    throw new ConfigError(`${file}: ${issues}`);
  }
  return parsed.data;
}

export function loadClient(clientId: string, clientsDir = CLIENTS_DIR): ClientBundle {
  const dir = join(clientsDir, clientId);
  const config = readYaml(dir, 'config.yaml', configSchema);
  if (config.client_id !== clientId) throw new ConfigError(`config.yaml: client_id is ${config.client_id}, folder is ${clientId}`);
  if (config.booking_mode === 'link_handoff' && !config.knowledge.services_file) {
    throw new ConfigError('config.yaml: link_handoff mode needs knowledge.services_file');
  }
  if (config.booking_mode === 'in_chat') {
    throw new ConfigError('config.yaml: in_chat booking needs a platform connector, which the pilot build does not include yet');
  }

  const k = config.knowledge;
  const bundle: ClientBundle = {
    config,
    services: readYaml(dir, k.services_file!, servicesFileSchema),
    details: readYaml(dir, k.service_details_file, serviceDetailsSchema),
    providers: readYaml(dir, k.providers_file, providersFileSchema).providers,
    faqs: readYaml(dir, k.faqs_file, faqsFileSchema).faqs,
    objections: k.objections_file ? readYaml(dir, k.objections_file, objectionsFileSchema).objections : [],
    fitRules: config.sales.fit_rules_file ? readYaml(dir, config.sales.fit_rules_file, fitRulesFileSchema).fit_rules : [],
    products: k.products_file ? readYaml(dir, k.products_file, productsFileSchema).products : [],
    concerns: k.concerns_file ? readYaml(dir, k.concerns_file, concernsFileSchema) : { concerns: [] },
    urgent: readYaml(dir, k.urgent_message_file, urgentFileSchema),
    voiceExamples: config.voice.examples_file && existsSync(join(dir, config.voice.examples_file))
      ? readFileSync(join(dir, config.voice.examples_file), 'utf8')
      : '',
  };
  crossCheck(bundle);
  return bundle;
}

// References between files must resolve, so a typo fails the build instead of confusing a visitor.
function crossCheck(b: ClientBundle): void {
  const serviceIds = new Set(b.services.services.map((s) => s.id));
  const addOnIds = new Set(b.services.add_ons.map((a) => a.id));
  const problems: string[] = [];
  const expect = (cond: boolean, msg: string) => { if (!cond) problems.push(msg); };

  for (const s of b.services.services) expect(s.id in b.details, `service-details: missing entry for ${s.id}`);
  for (const key of Object.keys(b.details)) expect(serviceIds.has(key), `service-details: ${key} isn't on the menu`);
  for (const p of b.config.booking.rules.prerequisites) {
    expect(serviceIds.has(p.service) && serviceIds.has(p.requires), `prerequisite ${p.service} → ${p.requires} names an unknown service`);
  }
  for (const key of Object.keys(b.config.booking.direct_links.services)) expect(serviceIds.has(key), `direct_links.services: unknown service ${key}`);
  for (const key of Object.keys(b.config.booking.availability?.service_ids ?? {})) expect(serviceIds.has(key), `booking.availability.service_ids: unknown service ${key}`);
  const providerIds = new Set(b.providers.map((p) => p.id));
  for (const key of Object.keys(b.config.booking.availability?.provider_ids ?? {})) expect(providerIds.has(key), `booking.availability.provider_ids: unknown provider ${key}`);
  if (b.config.booking.availability?.holds.enabled) expect(Object.keys(b.config.booking.availability.provider_ids).length > 0, 'booking.availability.holds needs provider_ids');
  for (const sid of b.config.sales.featured_services) expect(serviceIds.has(sid), `featured_services: unknown service ${sid}`);
  for (const [sid, addOns] of Object.entries(b.config.sales.add_on_suggestions)) {
    expect(serviceIds.has(sid), `add_on_suggestions: unknown service ${sid}`);
    for (const a of addOns) expect(addOnIds.has(a), `add_on_suggestions: unknown add-on ${a}`);
  }
  for (const promo of b.config.sales.promotions) {
    for (const sid of promo.services) expect(serviceIds.has(sid), `promotion ${promo.id}: unknown service ${sid}`);
    expect(!promo.ends || promo.starts <= promo.ends, `promotion ${promo.id}: starts after it ends`);
  }
  for (const p of b.providers) for (const sid of p.services) expect(serviceIds.has(sid), `provider ${p.id}: unknown service ${sid}`);
  for (const m of b.config.sales.memberships) expect(serviceIds.has(m.includes.service_id), `membership ${m.id}: unknown service ${m.includes.service_id}`);

  // The Sales Playbook fields (09-intake-wizard.md, Section 5).
  const sales = b.config.sales;
  for (const sid of Object.keys(sales.pricing.services)) expect(serviceIds.has(sid), `pricing.services: unknown service ${sid}`);
  for (const sid of sales.do_not_promote) {
    expect(serviceIds.has(sid), `do_not_promote: unknown service ${sid}`);
    expect(!sales.featured_services.includes(sid), `${sid} is both featured and do_not_promote`);
  }
  for (const [sid, others] of Object.entries(sales.pairings)) {
    expect(serviceIds.has(sid), `pairings: unknown service ${sid}`);
    for (const o of others) expect(serviceIds.has(o) && o !== sid, `pairings.${sid}: unknown or same service ${o}`);
  }
  const eventIds = new Set(sales.events.map((e) => e.id));
  expect(eventIds.size === sales.events.length, 'events: duplicate id');
  for (const promo of sales.promotions) if (promo.event) expect(eventIds.has(promo.event), `promotion ${promo.id}: unknown event ${promo.event}`);
  const hesitation = sales.tactics.hesitation_promotion;
  if (hesitation) {
    const promo = sales.promotions.find((p) => p.id === hesitation);
    expect(!!promo && !promo.event, `tactics.hesitation_promotion: ${hesitation} isn't a promotion open to everyone`);
  }
  const concernNames = new Set(b.concerns.concerns.map((c) => c.name.toLowerCase()));
  for (const c of b.concerns.concerns) for (const sid of c.services) expect(serviceIds.has(sid), `concern "${c.name}": unknown service ${sid}`);
  for (const sid of b.concerns.pregnancy?.services ?? []) expect(serviceIds.has(sid), `pregnancy: unknown service ${sid}`);
  for (const p of b.products) {
    for (const sid of p.after_services) expect(serviceIds.has(sid), `product ${p.name}: unknown service ${sid}`);
    for (const c of p.helps_with) expect(concernNames.has(c.toLowerCase()), `product ${p.name}: unknown concern "${c}"`);
  }

  if (problems.length) throw new ConfigError(problems.join('; '));
}
