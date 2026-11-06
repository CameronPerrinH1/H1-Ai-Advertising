// Every concierge deployment. Pick one with: pnpm --filter @concierge/infra synth -c deployment=<name>
// Staging runs in the agency's account with synthetic data; production entries are added per client
// during onboarding (03), each in the client's own account.
export interface Deployment {
  clientId: string;
  stage: 'staging' | 'production';
  domain?: { name: string; certificateArn: string };
  alarmEmail?: string; // alarms, and budget alerts when a budget is set (D40)
  monthlyBudgetUsd?: number;
  audit: { days: number; mode: 'compliance' | 'governance' };
}

export const DEPLOYMENTS: Record<string, Deployment> = {
  // The fictional demo spa, for the staff preview and sales demos. Short, governance-mode audit
  // retention so a staging stack can be torn down; production uses 6 years in compliance mode (D54).
  'glow-med-spa-staging': {
    clientId: 'glow-med-spa',
    stage: 'staging',
    alarmEmail: 'cameron@h1webdev.com',
    audit: { days: 7, mode: 'governance' },
  },
};
