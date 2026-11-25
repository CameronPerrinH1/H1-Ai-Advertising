// Post-deploy check (build plan 6.6, 12.2): reads the live account's settings back and runs a smoke
// test. A failed check blocks the release. Read-only, except the smoke-test chat, which is synthetic.
//   pnpm --filter @concierge/infra check:deploy glow-med-spa-staging [--no-chat]
import { CloudFormationClient, DescribeStacksCommand, paginateListStackResources } from '@aws-sdk/client-cloudformation';
import { BedrockClient, GetModelInvocationLoggingConfigurationCommand } from '@aws-sdk/client-bedrock';
import { APIGatewayClient, GetStageCommand } from '@aws-sdk/client-api-gateway';
import { GetFunctionConfigurationCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { DescribeContinuousBackupsCommand, DescribeTableCommand, DescribeTimeToLiveCommand, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { CloudTrailClient, GetEventSelectorsCommand, GetTrailStatusCommand } from '@aws-sdk/client-cloudtrail';
import { CloudFrontClient, GetDistributionConfigCommand } from '@aws-sdk/client-cloudfront';
import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';

const region = 'us-east-1';
const deployment = process.argv[2];
const runChat = !process.argv.includes('--no-chat');
if (!deployment) {
  console.error('Usage: pnpm --filter @concierge/infra check:deploy <deployment> [--no-chat]');
  process.exit(1);
}
const stackName = `Concierge-${deployment}`;

const cfn = new CloudFormationClient({ region });
const stack = (await cfn.send(new DescribeStacksCommand({ StackName: stackName }))).Stacks?.[0];
if (!stack) throw new Error(`Stack ${stackName} not found`);
const output = (key: string): string => {
  const v = stack.Outputs?.find((o) => o.OutputKey === key)?.OutputValue;
  if (!v) throw new Error(`Stack output ${key} is missing`);
  return v;
};
const resources: { type: string; id: string }[] = [];
for await (const page of paginateListStackResources({ client: cfn }, { StackName: stackName })) {
  for (const r of page.StackResourceSummaries ?? []) resources.push({ type: r.ResourceType ?? '', id: r.PhysicalResourceId ?? '' });
}
const ofType = (type: string) => resources.filter((r) => r.type === type).map((r) => r.id);

type Result = { ok: boolean; note?: string };
const checks: [string, () => Promise<Result>][] = [];
const check = (name: string, run: () => Promise<Result>) => checks.push([name, run]);
const expect = (ok: boolean, note?: string): Result => ({ ok, note });

// ---------- Logging stays off (D34) ----------
check('Bedrock model invocation logging is off', async () => {
  const cfg = (await new BedrockClient({ region }).send(new GetModelInvocationLoggingConfigurationCommand({}))).loggingConfig;
  const sink = cfg && (cfg.cloudWatchConfig || cfg.s3Config);
  return expect(!sink || cfg?.textDataDeliveryEnabled === false, sink ? 'model invocation logging is on for text' : undefined);
});

check('API Gateway: no data tracing, errors-only logs, no X-Ray', async () => {
  const [apiId] = ofType('AWS::ApiGateway::RestApi');
  const s = await new APIGatewayClient({ region }).send(new GetStageCommand({ restApiId: apiId, stageName: 'live' }));
  const all = s.methodSettings?.['*/*'];
  const ok = all?.dataTraceEnabled === false && ['ERROR', 'OFF'].includes(all?.loggingLevel ?? '') && !s.tracingEnabled;
  return expect(ok, `dataTrace=${all?.dataTraceEnabled} logging=${all?.loggingLevel} xray=${s.tracingEnabled}`);
});

check('Functions: no tracing, no debug output', async () => {
  const lambda = new LambdaClient({ region });
  const bad: string[] = [];
  for (const name of ofType('AWS::Lambda::Function')) {
    const f = await lambda.send(new GetFunctionConfigurationCommand({ FunctionName: name }));
    if (!f.Environment?.Variables?.CLIENT_ID) continue; // CDK helper functions
    if (f.TracingConfig?.Mode === 'Active' || f.Environment.Variables.CONCIERGE_DEBUG) bad.push(name);
  }
  return expect(bad.length === 0, bad.join(', ') || undefined);
});

// ---------- Data protection (D31, D54) ----------
check('Tables: KMS encryption, 14-day expiry, recovery window', async () => {
  const db = new DynamoDBClient({ region });
  const problems: string[] = [];
  for (const [table, days] of [[output('SessionsTable'), 7], [output('RecordsTable'), undefined]] as const) {
    const d = (await db.send(new DescribeTableCommand({ TableName: table }))).Table;
    if (d?.SSEDescription?.SSEType !== 'KMS' || d.SSEDescription.Status !== 'ENABLED') problems.push(`${table}: not KMS-encrypted`);
    const ttl = (await db.send(new DescribeTimeToLiveCommand({ TableName: table }))).TimeToLiveDescription;
    if (ttl?.TimeToLiveStatus !== 'ENABLED' || ttl.AttributeName !== 'expiresAt') problems.push(`${table}: TTL not on expiresAt`);
    const pitr = (await db.send(new DescribeContinuousBackupsCommand({ TableName: table }))).ContinuousBackupsDescription?.PointInTimeRecoveryDescription;
    if (pitr?.PointInTimeRecoveryStatus !== 'ENABLED') problems.push(`${table}: point-in-time recovery off`);
    if (days && pitr?.RecoveryPeriodInDays !== days) problems.push(`${table}: recovery window ${pitr?.RecoveryPeriodInDays} days, expected ${days}`);
  }
  return expect(problems.length === 0, problems.join('; ') || undefined);
});

check('Audit trail is recording chat-table reads and writes', async () => {
  const trail = new CloudTrailClient({ region });
  const [arn] = ofType('AWS::CloudTrail::Trail');
  const status = await trail.send(new GetTrailStatusCommand({ Name: arn }));
  const selectors = JSON.stringify((await trail.send(new GetEventSelectorsCommand({ TrailName: arn }))).AdvancedEventSelectors ?? []);
  const covered = [output('SessionsTable'), output('RecordsTable')].every((t) => selectors.includes(`table/${t}`));
  return expect(!!status.IsLogging && covered, `logging=${status.IsLogging} tablesCovered=${covered}`);
});

check('CloudFront: access logs off, firewall attached', async () => {
  const cfg = (await new CloudFrontClient({ region }).send(new GetDistributionConfigCommand({ Id: output('DistributionId') }))).DistributionConfig;
  return expect(!cfg?.Logging?.Enabled && !!cfg?.WebACLId, `logging=${cfg?.Logging?.Enabled} waf=${!!cfg?.WebACLId}`);
});

check('Kill switch is set to running', async () => {
  const p = await new SSMClient({ region }).send(new GetParameterCommand({ Name: output('KillSwitchParameter') }));
  return expect(p.Parameter?.Value === 'running', `value=${p.Parameter?.Value}`);
});

// ---------- Smoke test ----------
const chatUrl = output('ChatUrl');
check('Chat answers health and config through CloudFront', async () => {
  const health = await fetch(`${chatUrl}/api/health`);
  const config = (await (await fetch(`${chatUrl}/api/config`)).json()) as { available?: boolean };
  return expect(health.status === 200 && config.available === true, `health=${health.status} available=${config.available}`);
});

check('API refuses requests that skip CloudFront', async () => {
  const [apiId] = ofType('AWS::ApiGateway::RestApi');
  const direct = await fetch(`https://${apiId}.execute-api.${region}.amazonaws.com/live/api/health`);
  return expect(direct.status === 403, `status=${direct.status}`);
});

if (runChat) {
  check('A synthetic chat gets a real reply, then ends', async () => {
    const headers = { 'content-type': 'application/json', origin: chatUrl };
    const config = (await (await fetch(`${chatUrl}/api/config`)).json()) as { notice: { version: string } };
    const start = await fetch(`${chatUrl}/api/session`, { method: 'POST', headers, body: JSON.stringify({ lang: 'en', noticeVersion: config.notice.version }) });
    const cookie = start.headers.getSetCookie()[0]?.split(';')[0];
    if (start.status !== 200 || !cookie) return expect(false, `start=${start.status}`);
    const msg = await fetch(`${chatUrl}/api/message`, {
      method: 'POST',
      headers: { ...headers, cookie },
      body: JSON.stringify({ id: `postdeploy-${Date.now()}`, text: 'What are your hours on Saturday?', lang: 'en' }),
    });
    const reply = ((await msg.json()) as { reply?: { text?: string; cards?: { type: string }[] } }).reply;
    await fetch(`${chatUrl}/api/end`, { method: 'POST', headers: { ...headers, cookie } });
    // A fallback reply carries only a booking link; a real answer has text of its own.
    const fellBack = reply?.cards?.length === 1 && reply.cards[0]?.type === 'booking_link' && /accurate/i.test(reply.text ?? '');
    return expect(msg.status === 200 && !!reply?.text && !fellBack, `status=${msg.status} fallback=${fellBack}`);
  });
}

let failed = 0;
console.log(`Post-deploy check: ${stackName}\n`);
for (const [name, run] of checks) {
  let r: Result;
  try {
    r = await run();
  } catch (err) {
    r = { ok: false, note: (err as Error).message };
  }
  if (!r.ok) failed += 1;
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${name}${!r.ok && r.note ? `  (${r.note})` : ''}`);
}
console.log(`\n${checks.length - failed}/${checks.length} passed`);
process.exit(failed ? 1 : 0);
