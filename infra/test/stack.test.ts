// Locks in the stack's privacy and security settings (build plan 6), so a later change can't
// quietly turn one off. Bundling is skipped; the post-deploy check verifies the live account.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { ConciergeStack, SESSION_COOKIE, type ConciergeStackProps } from '../lib/concierge-stack.ts';

const widgetDist = mkdtempSync(join(tmpdir(), 'widget-'));
writeFileSync(join(widgetDist, 'index.html'), '<!doctype html>');

function synth(overrides: Partial<ConciergeStackProps> = {}): Template {
  const app = new App({ context: { 'aws:cdk:bundling-stacks': [] } });
  const stack = new ConciergeStack(app, 'Test', {
    env: { account: '111111111111', region: 'us-east-1' },
    clientId: 'glow-med-spa',
    stage: 'staging',
    repoRoot: join(import.meta.dirname, '../..'),
    widgetDist,
    modelIds: ['us.anthropic.claude-haiku-5-5'],
    business: { name: 'Glow Med Spa', phone: '(555) 555-0100', bookingUrl: 'https://book.glowmedspa.example' },
    embedOrigins: ['https://glowmedspa.example'],
    audit: { days: 7, mode: 'governance' },
    alarmEmail: 'ops@agency.example',
    ...overrides,
  });
  return Template.fromStack(stack);
}

const t = synth();

describe('data (7.1, D31, D54)', () => {
  it('encrypts both tables with the client key, with TTL and point-in-time recovery', () => {
    t.resourceCountIs('AWS::DynamoDB::GlobalTable', 2);
    t.hasResourceProperties('AWS::DynamoDB::GlobalTable', {
      TableName: 'concierge-glow-med-spa-sessions',
      SSESpecification: { SSEEnabled: true, SSEType: 'KMS' },
      TimeToLiveSpecification: { AttributeName: 'expiresAt', Enabled: true },
      Replicas: [Match.objectLike({ PointInTimeRecoverySpecification: { PointInTimeRecoveryEnabled: true, RecoveryPeriodInDays: 7 } })],
      GlobalSecondaryIndexes: Match.arrayWith([
        Match.objectLike({ IndexName: 'flagged', Projection: { ProjectionType: 'INCLUDE', NonKeyAttributes: ['reviewFlags', 'reviewScores'] } }),
      ]),
    });
  });

  it('records reads and writes of both tables in a locked audit bucket', () => {
    t.hasResourceProperties('AWS::CloudTrail::Trail', {
      AdvancedEventSelectors: Match.arrayWith([
        Match.objectLike({ FieldSelectors: Match.arrayWith([{ Field: 'resources.type', Equals: ['AWS::DynamoDB::Table'] }]) }),
      ]),
      KMSKeyId: Match.anyValue(),
    });
    t.hasResourceProperties('AWS::S3::Bucket', {
      ObjectLockEnabled: true,
      ObjectLockConfiguration: { ObjectLockEnabled: 'Enabled', Rule: { DefaultRetention: { Mode: 'GOVERNANCE', Days: 7 } } },
    });
  });

  it('uses 6-year compliance-mode audit retention and deletion protection in production', () => {
    const p = synth({ stage: 'production', audit: { days: 2190, mode: 'compliance' } });
    p.hasResourceProperties('AWS::S3::Bucket', { ObjectLockConfiguration: { ObjectLockEnabled: 'Enabled', Rule: { DefaultRetention: { Mode: 'COMPLIANCE', Days: 2190 } } } });
    p.hasResourceProperties('AWS::DynamoDB::GlobalTable', { Replicas: [Match.objectLike({ DeletionProtectionEnabled: true })] });
  });
});

describe('no conversation text in logs (D34)', () => {
  it('keeps API Gateway data tracing and X-Ray off, with errors-only execution logs', () => {
    t.hasResourceProperties('AWS::ApiGateway::Stage', {
      TracingEnabled: false,
      MethodSettings: [Match.objectLike({ DataTraceEnabled: false, LoggingLevel: 'ERROR' })],
    });
  });

  it('never turns on debug output or tracing in the functions', () => {
    const fns = t.findResources('AWS::Lambda::Function', { Properties: { Handler: Match.stringLikeRegexp('^index\\.(api|sweep|weeklyReport|review)$') } });
    expect(Object.keys(fns)).toHaveLength(4);
    for (const f of Object.values(fns)) {
      const props = f.Properties as { Environment: { Variables: Record<string, unknown> }; TracingConfig?: { Mode: string } };
      expect(props.Environment.Variables.CONCIERGE_DEBUG).toBeUndefined();
      expect(props.TracingConfig?.Mode ?? 'PassThrough').toBe('PassThrough');
    }
  });

  it('turns CloudFront access logs off and forwards only the session cookie to the API', () => {
    const dist = Object.values(t.findResources('AWS::CloudFront::Distribution'))[0]!.Properties as { DistributionConfig: Record<string, unknown> };
    expect(dist.DistributionConfig.Logging).toBeUndefined();
    t.hasResourceProperties('AWS::CloudFront::OriginRequestPolicy', {
      OriginRequestPolicyConfig: Match.objectLike({
        CookiesConfig: { CookieBehavior: 'whitelist', Cookies: [SESSION_COOKIE] },
        QueryStringsConfig: { QueryStringBehavior: 'none' },
      }),
    });
  });
});

describe('access and abuse limits (6.4, D4)', () => {
  it('lets the functions call only the configured models', () => {
    const policies = t.findResources('AWS::IAM::Policy');
    const bedrock = Object.values(policies).flatMap((p) =>
      (p.Properties as { PolicyDocument: { Statement: { Sid?: string; Action: string | string[]; Resource: unknown }[] } }).PolicyDocument.Statement.filter((s) => s.Sid === 'Bedrock'),
    );
    expect(bedrock.length).toBeGreaterThan(0);
    for (const s of bedrock) {
      expect(s.Action).toBe('bedrock:InvokeModel');
      expect(JSON.stringify(s.Resource)).toContain('claude-haiku-5-5');
      expect(JSON.stringify(s.Resource)).not.toContain('"*"');
    }
  });

  it('gives the review function read-only access to the chats table and nothing else (D39, D69)', () => {
    const [fnId, fn] = Object.entries(t.findResources('AWS::Lambda::Function', { Properties: { Handler: 'index.review' } }))[0]!;
    const props = fn.Properties as { Role: { 'Fn::GetAtt': [string, string] }; Environment: { Variables: Record<string, unknown> } };
    expect(Object.keys(props.Environment.Variables).sort()).toEqual(['CLIENT_ID', 'CONCIERGE_CLIENTS_DIR', 'CONCIERGE_SESSIONS_TABLE', 'NODE_OPTIONS']);
    const role = props.Role['Fn::GetAtt'][0];
    const statements = Object.values(t.findResources('AWS::IAM::Policy'))
      .map((p) => p.Properties as { Roles: { Ref: string }[]; PolicyDocument: { Statement: { Action: string | string[]; Resource: unknown }[] } })
      .filter((p) => p.Roles.some((r) => r.Ref === role))
      .flatMap((p) => p.PolicyDocument.Statement);
    const actions = statements.flatMap((s) => [s.Action].flat());
    expect(actions).toContain('dynamodb:Query');
    expect(actions).toContain('dynamodb:GetItem');
    expect(actions.filter((a) => !/^(dynamodb:(BatchGet|Get|Query|Scan|ConditionCheck|Describe)|kms:(Decrypt|DescribeKey))/.test(a))).toEqual([]);
    expect(JSON.stringify(statements)).not.toMatch(/"Records[0-9A-F]{8}"/); // the records table's logical id
    t.hasOutput('ReviewFunction', { Value: { Ref: fnId } });
  });

  it('puts the API behind WAF with a per-IP rate limit, and requires TLS for email', () => {
    t.hasResourceProperties('AWS::WAFv2::WebACL', {
      Scope: 'CLOUDFRONT',
      Rules: Match.arrayWith([Match.objectLike({ Name: 'api-rate-limit', Statement: { RateBasedStatement: Match.objectLike({ Limit: 100 }) } })]),
    });
    t.hasResourceProperties('AWS::SES::ConfigurationSet', { DeliveryOptions: { TlsPolicy: 'REQUIRE' } });
  });

  it('restricts which sites can embed the chat', () => {
    t.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
      ResponseHeadersPolicyConfig: {
        SecurityHeadersConfig: Match.objectLike({
          ContentSecurityPolicy: { ContentSecurityPolicy: Match.stringLikeRegexp("frame-ancestors 'self' https://glowmedspa.example"), Override: true },
        }),
      },
    });
  });

  it('creates the kill switch, running by default, and alarms that email the agency', () => {
    t.hasResourceProperties('AWS::SSM::Parameter', { Name: '/concierge/glow-med-spa/chat', Value: 'running' });
    t.hasResourceProperties('AWS::SNS::Subscription', { Protocol: 'email', Endpoint: 'ops@agency.example' });
    expect(Object.keys(t.findResources('AWS::CloudWatch::Alarm')).length).toBeGreaterThanOrEqual(8);
  });
});
