// CDK app. Examples:
//   pnpm --filter @concierge/infra synth -c deployment=glow-med-spa-staging
//   pnpm --filter @concierge/infra deploy -c deployment=glow-med-spa-staging -c handoffEmail=test@agency.example
// handoffEmail: a verified test address that receives the handoff emails. A real client's staging stack
// must set it (D29); a production stack may, while it's tested before go-live, so test handoffs never
// reach the spa. Deploy again without it at go-live.
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { App } from 'aws-cdk-lib';
import { loadClient } from '@concierge/backend';
import { ConciergeStack } from '../lib/concierge-stack.ts';
import { DEPLOYMENTS } from '../lib/deployments.ts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const app = new App();
const deploymentName: string = app.node.tryGetContext('deployment') ?? 'glow-med-spa-staging';
const d = DEPLOYMENTS[deploymentName];
if (!d) throw new Error(`Unknown deployment "${deploymentName}". Known: ${Object.keys(DEPLOYMENTS).join(', ')}`);

if (d.account && process.env.CDK_DEFAULT_ACCOUNT && process.env.CDK_DEFAULT_ACCOUNT !== d.account) {
  throw new Error(`${deploymentName} belongs in account ${d.account}, but you're signed in to ${process.env.CDK_DEFAULT_ACCOUNT}. Use the right profile (--profile).`);
}

const c = loadClient(d.clientId).config;
const handoffEmail: string | undefined = app.node.tryGetContext('handoffEmail');
if (handoffEmail && d.stage === 'production') console.warn(`Testing before go-live: handoffs go to ${handoffEmail}, not the spa. Deploy again without handoffEmail at go-live.`);
// D29: H1's staging account never emails a real spa; its handoffs go to a test inbox.
if (d.stage === 'staging' && !c.demo && !handoffEmail) throw new Error(`Staging ${d.clientId} needs -c handoffEmail=<test inbox>, so it never emails the spa.`);
const senderDomain = c.handoff.email_from.split('@')[1]!;

new ConciergeStack(app, `Concierge-${deploymentName}`, {
  // WAF for CloudFront lives in us-east-1, and so does everything else (3.1).
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'us-east-1' },
  clientId: d.clientId,
  stage: d.stage,
  repoRoot,
  widgetDist: join(repoRoot, 'widget/dist'),
  modelIds: [...new Set([c.model.id, c.model.summarizer_id].filter((m): m is string => !!m))],
  business: { name: c.business.name, phone: c.business.phone, bookingUrl: c.booking.direct_links.default },
  // Each allowed domain with and without www. (a domain already listed with www. isn't doubled).
  embedOrigins: [...new Set(c.security.allowed_domains.flatMap((domain) => { const bare = domain.replace(/^www\./, ''); return [`https://${bare}`, `https://www.${bare}`]; }))],
  domain: d.domain,
  alarmEmail: app.node.tryGetContext('alarmEmail') ?? d.alarmEmail,
  monthlyBudgetUsd: d.monthlyBudgetUsd,
  audit: d.audit,
  bookingSecretName: c.booking.availability ? d.bookingSecretName : undefined,
  holds: (app.node.tryGetContext('holds') as 'off' | 'preview' | 'test' | 'on' | undefined) ?? d.holds,
  sesIdentity: handoffEmail ? { email: handoffEmail } : c.demo || d.stage === 'staging' ? undefined : { domain: senderDomain },
  handoffOverride: handoffEmail ? { from: handoffEmail, to: handoffEmail } : undefined,
});
