// One concierge for one client in one AWS account (D5, build plan 3 and 6). Staging runs in the
// agency's account with synthetic data; production runs in the client's own account.
//
//   chat.<domain> ── CloudFront + WAF ─┬─ /         S3 (widget, loader.js, client-fallback.json)
//                                      └─ /api/*    API Gateway ── Lambda ── Bedrock, DynamoDB, SES
//   EventBridge ── sweep (5 min): ends idle chats, writes summaries
//              └── weekly report (Mondays)
import { join } from 'node:path';
import { CfnOutput, Duration, RemovalPolicy, Stack, Tags, type StackProps } from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as budgets from 'aws-cdk-lib/aws-budgets';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as cloudtrail from 'aws-cdk-lib/aws-cloudtrail';
import * as cw from 'aws-cdk-lib/aws-cloudwatch';
import * as cwActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as secrets from 'aws-cdk-lib/aws-secretsmanager';
import * as ses from 'aws-cdk-lib/aws-ses';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';

export const SESSION_COOKIE = '__Host-concierge_session';

export interface ConciergeStackProps extends StackProps {
  clientId: string;
  bookingSecretName?: string; // the booking platform's API keys, for live openings (deployments.ts)
  holds?: 'off' | 'preview' | 'test' | 'on'; // in-chat booking and holds; off unless set
  stage: 'staging' | 'production';
  repoRoot: string; // the concierge folder; the monorepo root is its parent
  widgetDist: string; // the built widget (pnpm --filter @concierge/widget build)
  modelIds: string[]; // Bedrock inference profiles the concierge may call (D4)
  business: { name: string; phone: string; bookingUrl: string }; // for the unavailable view (D43)
  embedOrigins: string[]; // sites allowed to embed the chat, e.g. https://glowmedspa.example
  domain?: { name: string; certificateArn: string }; // chat.<domain>; omit to use the CloudFront domain
  alarmEmail?: string;
  monthlyBudgetUsd?: number;
  audit: { days: number; mode: 'compliance' | 'governance' }; // production: 6 years, compliance (D54)
  sesIdentity?: { domain: string } | { email: string };
  handoffOverride?: { from: string; to: string }; // staging only: handoffs go to a test inbox
}

export class ConciergeStack extends Stack {
  constructor(scope: Construct, id: string, props: ConciergeStackProps) {
    super(scope, id, props);
    const { clientId, stage } = props;
    const prod = stage === 'production';
    const removal = prod ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY;
    const name = (s: string) => `concierge-${clientId}-${s}`;
    Tags.of(this).add('concierge:client', clientId);
    Tags.of(this).add('concierge:stage', stage);

    // ---------- Encryption (6.7): one customer-managed key for tables, secrets, logs, and audit ----------
    const key = new kms.Key(this, 'DataKey', {
      alias: `alias/concierge/${clientId}`,
      description: `Concierge data for ${clientId}`,
      enableKeyRotation: true,
      removalPolicy: removal,
    });
    const service = (s: string) => new iam.ServicePrincipal(s);
    key.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: 'CloudWatchLogs',
        principals: [service(`logs.${this.region}.amazonaws.com`)],
        actions: ['kms:Encrypt*', 'kms:Decrypt*', 'kms:ReEncrypt*', 'kms:GenerateDataKey*', 'kms:Describe*'],
        resources: ['*'],
        conditions: { ArnLike: { 'kms:EncryptionContext:aws:logs:arn': `arn:aws:logs:${this.region}:${this.account}:log-group:*` } },
      }),
    );
    key.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: 'CloudTrail',
        principals: [service('cloudtrail.amazonaws.com')],
        actions: ['kms:GenerateDataKey*', 'kms:DescribeKey'],
        resources: ['*'],
        conditions: { StringLike: { 'kms:EncryptionContext:aws:cloudtrail:arn': `arn:aws:cloudtrail:*:${this.account}:trail/*` } },
      }),
    );
    key.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: 'AlarmNotifications',
        principals: [service('cloudwatch.amazonaws.com'), service('budgets.amazonaws.com')],
        actions: ['kms:Decrypt', 'kms:GenerateDataKey*'],
        resources: ['*'],
      }),
    );

    // ---------- Data (7.1, D31): ephemeral sessions and long-lived records ----------
    const sessions = new dynamodb.TableV2(this, 'Sessions', {
      tableName: name('sessions'),
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      timeToLiveAttribute: 'expiresAt', // 30 days after the chat's last activity, 90 if flagged for review (D31, D69)
      encryption: dynamodb.TableEncryptionV2.customerManagedKey(key),
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true, recoveryPeriodInDays: 7 },
      globalSecondaryIndexes: [
        {
          indexName: 'by-state',
          partitionKey: { name: 'state', type: dynamodb.AttributeType.STRING },
          sortKey: { name: 'lastActivity', type: dynamodb.AttributeType.NUMBER },
          projectionType: dynamodb.ProjectionType.KEYS_ONLY,
        },
        {
          // Chats flagged for review (D69), kept 90 days instead of 30. Read only by the review function.
          // Flags and scores are projected so listing never reads a transcript.
          indexName: 'flagged',
          partitionKey: { name: 'review', type: dynamodb.AttributeType.STRING },
          sortKey: { name: 'lastActivity', type: dynamodb.AttributeType.NUMBER },
          projectionType: dynamodb.ProjectionType.INCLUDE,
          nonKeyAttributes: ['reviewFlags', 'reviewScores'],
        },
      ],
      deletionProtection: prod,
      removalPolicy: removal,
    });
    const records = new dynamodb.TableV2(this, 'Records', {
      tableName: name('records'),
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      timeToLiveAttribute: 'expiresAt',
      encryption: dynamodb.TableEncryptionV2.customerManagedKey(key),
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      deletionProtection: prod,
      removalPolicy: removal,
    });

    // ---------- Secrets and the kill switch ----------
    const generated = (id: string, length: number, description: string) =>
      new secrets.Secret(this, id, {
        description,
        encryptionKey: key,
        generateSecretString: { passwordLength: length, excludePunctuation: true, includeSpace: false },
        removalPolicy: removal,
      });
    const phoneKey = generated('PhoneHashKey', 64, 'Keys the phone-number hashes used for limits and deletion requests (7.2)');
    const staffCode = generated('StaffCode', 20, 'Staff mode passcode until real sign-in (D64)');
    const originVerify = generated('OriginVerify', 48, 'Header CloudFront sends so the API only answers through CloudFront and WAF');
    const control = new ssm.StringParameter(this, 'ChatControl', {
      parameterName: `/concierge/${clientId}/chat`,
      stringValue: 'running',
      description: 'Kill switch (D43): set to "paused" to show visitors the unavailable view within a minute',
    });

    // ---------- Email (D36): TLS required on every handoff ----------
    const email = new ses.ConfigurationSet(this, 'Email', {
      configurationSetName: name('email'),
      tlsPolicy: ses.ConfigurationSetTlsPolicy.REQUIRE,
    });
    let identity: ses.EmailIdentity | undefined;
    if (props.sesIdentity) {
      identity = new ses.EmailIdentity(this, 'Sender', {
        identity: 'domain' in props.sesIdentity ? ses.Identity.domain(props.sesIdentity.domain) : ses.Identity.email(props.sesIdentity.email),
        configurationSet: email,
      });
    }

    // ---------- Functions ----------
    const logGroup = (id: string) =>
      new logs.LogGroup(this, id, { retention: logs.RetentionDays.THREE_MONTHS, encryptionKey: key, removalPolicy: removal });
    const environment: Record<string, string> = {
      CLIENT_ID: clientId,
      CONCIERGE_CLIENTS_DIR: '/var/task/clients',
      // Without chat.<domain> (staging, or a client's stack tested before go-live), the chat's
      // CloudFront address is a different site from the spa's page (see app.ts).
      ...(props.stage === 'staging' || !props.domain ? { CROSS_SITE_COOKIE: '1' } : {}),
      CONCIERGE_SESSIONS_TABLE: sessions.tableName,
      CONCIERGE_RECORDS_TABLE: records.tableName,
      SES_CONFIGURATION_SET: email.configurationSetName,
      PHONE_HASH_SECRET_ARN: phoneKey.secretArn,
      STAFF_CODE_SECRET_ARN: staffCode.secretArn,
      ORIGIN_VERIFY_SECRET_ARN: originVerify.secretArn,
      CONCIERGE_CONTROL_PARAM: control.parameterName,
      WIDGET_ORIGINS: props.domain ? `https://${props.domain.name}` : '',
      NODE_OPTIONS: '--enable-source-maps',
      ...(props.handoffOverride ? { HANDOFF_EMAIL_FROM: props.handoffOverride.from, HANDOFF_EMAIL_TO: props.handoffOverride.to } : {}),
    };
    const fn = (id: string, handler: string, timeout: Duration, memorySize = 1024, env = environment) =>
      new nodejs.NodejsFunction(this, id, {
        entry: join(props.repoRoot, 'backend/src/lambda.ts'),
        handler,
        // The concierge lives in the H1 monorepo, which holds the one pnpm lockfile.
        projectRoot: join(props.repoRoot, '..'),
        depsLockFilePath: join(props.repoRoot, '../pnpm-lock.yaml'),
        runtime: lambda.Runtime.NODEJS_22_X,
        architecture: lambda.Architecture.ARM_64,
        memorySize,
        timeout,
        environment: env,
        tracing: lambda.Tracing.DISABLED, // X-Ray off (6.6)
        logGroup: logGroup(`${id}Logs`),
        bundling: {
          format: nodejs.OutputFormat.ESM,
          target: 'node22',
          minify: true,
          // Line numbers for error traces, but no source text: client admins can read deployed code (6.8).
          sourceMap: true,
          sourcesContent: false,
          externalModules: [], // pin the AWS SDK version we test with
          mainFields: ['module', 'main'],
          banner: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
          commandHooks: {
            beforeBundling: () => [],
            beforeInstall: () => [],
            // The client's config and knowledge files ship inside the function (12.3). The input dir
            // is the monorepo root (projectRoot), so the clients folder is under concierge/.
            afterBundling: (_inputDir: string, outputDir: string) => [
              `mkdir -p "${outputDir}/clients" && cp -R "${join(props.repoRoot, 'clients', clientId)}" "${outputDir}/clients/${clientId}"`,
            ],
          },
        },
      });
    const bookingSecret = props.bookingSecretName ? secrets.Secret.fromSecretNameV2(this, 'BookingSecret', props.bookingSecretName) : undefined;
    const bookingEnv = bookingSecret
      ? { ...environment, BOOKING_SECRET_ID: bookingSecret.secretName, ...(props.holds && props.holds !== 'off' ? { BOOKING_HOLDS: props.holds } : {}) }
      : environment;
    const apiFn = fn('Api', 'api', Duration.seconds(29), 1024, bookingEnv);
    bookingSecret?.grantRead(apiFn);
    // Under the 5-minute schedule, so runs never overlap. With holds written (on or test) it also
    // releases stale holds; preview writes none, so the sweep needs no booking access then.
    const holdsWrite = props.holds === 'on' || props.holds === 'test';
    const sweepFn = fn('Sweep', 'sweep', Duration.minutes(4), 1024, holdsWrite ? bookingEnv : environment);
    if (holdsWrite) bookingSecret?.grantRead(sweepFn);
    const weeklyFn = fn('WeeklyReport', 'weeklyReport', Duration.minutes(2), 512);
    // Review function (D39, D69): the review role invokes it directly; it has no API route. It only
    // reads the sessions table, so it gets none of the secrets, email, or model settings.
    const reviewFn = fn('Review', 'review', Duration.seconds(30), 512, {
      CLIENT_ID: clientId,
      CONCIERGE_CLIENTS_DIR: environment.CONCIERGE_CLIENTS_DIR!,
      CONCIERGE_SESSIONS_TABLE: sessions.tableName,
      NODE_OPTIONS: environment.NODE_OPTIONS!,
    });
    sessions.grantReadData(reviewFn);

    for (const f of [apiFn, sweepFn, weeklyFn]) {
      sessions.grantReadWriteData(f);
      records.grantReadWriteData(f);
      for (const s of [phoneKey, staffCode, originVerify]) s.grantRead(f);
      control.grantRead(f);
      f.addToRolePolicy(
        new iam.PolicyStatement({
          sid: 'Bedrock',
          actions: ['bedrock:InvokeModel'],
          resources: props.modelIds.flatMap((m) => [
            `arn:aws:bedrock:${this.region}:${this.account}:inference-profile/${m}`,
            // A us. profile routes to the model in any US region (D4).
            `arn:aws:bedrock:*::foundation-model/${m.replace(/^us\./, '')}*`,
          ]),
        }),
      );
    }
    // The sweep emails the spa when it releases a hold nobody turned into an appointment.
    for (const f of holdsWrite ? [apiFn, weeklyFn, sweepFn] : [apiFn, weeklyFn]) {
      f.addToRolePolicy(
        new iam.PolicyStatement({
          sid: 'SendEmail',
          actions: ['ses:SendEmail'],
          resources: [`arn:aws:ses:${this.region}:${this.account}:identity/*`, `arn:aws:ses:${this.region}:${this.account}:configuration-set/${email.configurationSetName}`],
        }),
      );
    }

    new events.Rule(this, 'SweepSchedule', { schedule: events.Schedule.rate(Duration.minutes(5)), targets: [new targets.LambdaFunction(sweepFn)] });
    new events.Rule(this, 'WeeklySchedule', {
      schedule: events.Schedule.cron({ weekDay: 'MON', hour: '15', minute: '0' }), // 8 AM Pacific in daylight time
      targets: [new targets.LambdaFunction(weeklyFn)],
    });

    // ---------- API (6.4, 6.6): no data tracing, errors-only execution logs, minimal access logs ----------
    const accessLogs = logGroup('ApiAccessLogs');
    const api = new apigw.RestApi(this, 'ApiGateway', {
      restApiName: name('api'),
      endpointTypes: [apigw.EndpointType.REGIONAL],
      cloudWatchRole: true,
      deployOptions: {
        stageName: 'live',
        loggingLevel: apigw.MethodLoggingLevel.ERROR,
        dataTraceEnabled: false,
        tracingEnabled: false,
        metricsEnabled: true,
        throttlingRateLimit: 50,
        throttlingBurstLimit: 100,
        accessLogDestination: new apigw.LogGroupLogDestination(accessLogs),
        accessLogFormat: apigw.AccessLogFormat.custom(
          JSON.stringify({ requestId: '$context.requestId', status: '$context.status', latency: '$context.responseLatency', path: '$context.resourcePath' }),
        ),
      },
    });
    api.root.addResource('api').addResource('{proxy+}').addMethod('ANY', new apigw.LambdaIntegration(apiFn));

    // ---------- Firewall (6.4) ----------
    const visibility = (metricName: string) => ({ cloudWatchMetricsEnabled: true, metricName, sampledRequestsEnabled: false });
    const waf = new wafv2.CfnWebACL(this, 'Firewall', {
      scope: 'CLOUDFRONT',
      defaultAction: { allow: {} },
      visibilityConfig: visibility(name('waf')),
      rules: [
        {
          name: 'api-rate-limit',
          priority: 0,
          action: { block: {} },
          statement: {
            rateBasedStatement: {
              limit: 100,
              evaluationWindowSec: 300,
              aggregateKeyType: 'IP',
              scopeDownStatement: {
                byteMatchStatement: {
                  searchString: '/api/',
                  fieldToMatch: { uriPath: {} },
                  textTransformations: [{ priority: 0, type: 'NONE' }],
                  positionalConstraint: 'STARTS_WITH',
                },
              },
            },
          },
          visibilityConfig: visibility(name('rate-limit')),
        },
        {
          name: 'aws-ip-reputation',
          priority: 1,
          overrideAction: { none: {} },
          statement: { managedRuleGroupStatement: { vendorName: 'AWS', name: 'AWSManagedRulesAmazonIpReputationList' } },
          visibilityConfig: visibility(name('ip-reputation')),
        },
        {
          name: 'aws-common',
          priority: 2,
          overrideAction: { none: {} },
          statement: { managedRuleGroupStatement: { vendorName: 'AWS', name: 'AWSManagedRulesCommonRuleSet' } },
          visibilityConfig: visibility(name('common')),
        },
      ],
    });

    // ---------- CloudFront (D7): widget and API share one origin ----------
    const site = new s3.Bucket(this, 'Widget', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    const frameAncestors = ["'self'", ...props.embedOrigins].join(' ');
    const widgetHeaders = new cloudfront.ResponseHeadersPolicy(this, 'WidgetHeaders', {
      securityHeadersBehavior: {
        contentSecurityPolicy: {
          contentSecurityPolicy: [
            "default-src 'self'",
            "connect-src 'self'",
            "img-src 'self' data: blob:",
            "style-src 'self' 'unsafe-inline'",
            "script-src 'self'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            `frame-ancestors ${frameAncestors}`,
          ].join('; '),
          override: true,
        },
        contentTypeOptions: { override: true },
        strictTransportSecurity: { accessControlMaxAge: Duration.days(365), includeSubdomains: true, override: true },
        referrerPolicy: { referrerPolicy: cloudfront.HeadersReferrerPolicy.NO_REFERRER, override: true },
      },
    });
    const apiRequests = new cloudfront.OriginRequestPolicy(this, 'ApiRequests', {
      headerBehavior: cloudfront.OriginRequestHeaderBehavior.allowList('Origin', 'Content-Type', 'x-viewer-host'),
      cookieBehavior: cloudfront.OriginRequestCookieBehavior.allowList(SESSION_COOKIE),
      queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.none(),
    });
    // Tells the API which address the visitor used, so it can accept only same-origin chat requests.
    const viewerHost = new cloudfront.Function(this, 'ViewerHost', {
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      code: cloudfront.FunctionCode.fromInline(
        "function handler(event) { var r = event.request; r.headers['x-viewer-host'] = { value: r.headers.host.value }; return r; }",
      ),
    });
    const distribution = new cloudfront.Distribution(this, 'Cdn', {
      comment: name('chat'),
      defaultRootObject: 'index.html',
      domainNames: props.domain ? [props.domain.name] : undefined,
      certificate: props.domain ? acm.Certificate.fromCertificateArn(this, 'Certificate', props.domain.certificateArn) : undefined,
      // TLS 1.2+ needs a custom certificate; staging's default *.cloudfront.net certificate can't set it.
      minimumProtocolVersion: props.domain ? cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021 : undefined,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      webAclId: waf.attrArn,
      enableLogging: false, // logs would hold cookies (6.6)
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(site),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy: widgetHeaders,
        compress: true,
      },
      additionalBehaviors: {
        '/api/*': {
          origin: new origins.RestApiOrigin(api, { customHeaders: { 'x-origin-verify': originVerify.secretValue.unsafeUnwrap() } }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: apiRequests,
          responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
          functionAssociations: [{ function: viewerHost, eventType: cloudfront.FunctionEventType.VIEWER_REQUEST }],
        },
      },
    });
    new s3deploy.BucketDeployment(this, 'WidgetFiles', {
      destinationBucket: site,
      sources: [
        s3deploy.Source.asset(props.widgetDist),
        // The unavailable view's phone number and booking link, for when the API can't be reached.
        s3deploy.Source.jsonData('client-fallback.json', props.business),
      ],
      distribution,
      distributionPaths: ['/*'],
      memoryLimit: 512,
    });

    // ---------- Audit trail (D54): every read and write of chat data ----------
    const audit = new s3.Bucket(this, 'Audit', {
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: key,
      bucketKeyEnabled: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      versioned: true,
      objectLockDefaultRetention:
        props.audit.mode === 'compliance'
          ? s3.ObjectLockRetention.compliance(Duration.days(props.audit.days))
          : s3.ObjectLockRetention.governance(Duration.days(props.audit.days)),
      removalPolicy: RemovalPolicy.RETAIN,
    });
    const trail = new cloudtrail.Trail(this, 'AuditTrail', {
      bucket: audit,
      encryptionKey: key,
      enableFileValidation: true,
      isMultiRegionTrail: false,
      includeGlobalServiceEvents: true,
    });
    (trail.node.defaultChild as cloudtrail.CfnTrail).advancedEventSelectors = [
      { name: 'Management events', fieldSelectors: [{ field: 'eventCategory', equalTo: ['Management'] }] },
      {
        name: 'Chat data reads and writes',
        fieldSelectors: [
          { field: 'eventCategory', equalTo: ['Data'] },
          { field: 'resources.type', equalTo: ['AWS::DynamoDB::Table'] },
          { field: 'resources.ARN', equalTo: [sessions.tableArn, records.tableArn] },
        ],
      },
    ];

    // ---------- Alarms (D40) ----------
    const topic = new sns.Topic(this, 'Alarms', { displayName: `Concierge ${clientId} (${stage})`, masterKey: key });
    if (props.alarmEmail) topic.addSubscription(new subs.EmailSubscription(props.alarmEmail));
    const notify = new cwActions.SnsAction(topic);
    const alarm = (id: string, metric: cw.IMetric, threshold: number, description: string, periods = 1) =>
      new cw.Alarm(this, id, {
        metric,
        threshold,
        evaluationPeriods: periods,
        comparisonOperator: cw.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cw.TreatMissingData.NOT_BREACHING,
        alarmDescription: description,
      }).addAlarmAction(notify);
    const fromLogs = (id: string, pattern: string, metricName: string, value = '1') => {
      new logs.MetricFilter(this, id, {
        logGroup: apiFn.logGroup,
        filterPattern: logs.FilterPattern.literal(pattern),
        metricNamespace: `Concierge/${clientId}`,
        metricName,
        metricValue: value,
        defaultValue: 0,
      });
      return new cw.Metric({ namespace: `Concierge/${clientId}`, metricName, statistic: 'Sum', period: Duration.minutes(5) });
    };
    const fiveMin = { period: Duration.minutes(5) };
    alarm('ApiErrors', apiFn.metricErrors(fiveMin), 5, 'The chat API is failing');
    alarm('Api5xx', api.metricServerError(fiveMin), 5, 'The chat API is returning server errors');
    alarm('SlowReplies', apiFn.metricDuration({ period: Duration.minutes(5), statistic: 'p95' }), 20_000, 'Replies are taking over 20 seconds', 3);
    alarm('Fallbacks', fromLogs('FallbackFilter', '{ $.event = "reply_fallback" }', 'ReplyFallbacks').with({ period: Duration.hours(1) }), 10, 'Many replies fell back to the safe answer');
    alarm('Throttling', fromLogs('ThrottleFilter', '{ $.event = "turn_error" && $.error = "ThrottlingException" }', 'BedrockThrottles'), 3, 'Bedrock is throttling the concierge');
    alarm('TokenSpike', fromLogs('TokensFilter', '{ $.event = "model_call" }', 'InputTokens', '$.tokensIn').with({ period: Duration.hours(1) }), 5_000_000, 'Unusual model usage in the last hour');
    alarm('SweepErrors', sweepFn.metricErrors({ period: Duration.minutes(15) }), 1, 'Summaries are not being written', 2);
    alarm('WeeklyReportErrors', weeklyFn.metricErrors({ period: Duration.hours(1) }), 1, 'The weekly report failed');

    if (props.monthlyBudgetUsd && props.alarmEmail) {
      new budgets.CfnBudget(this, 'Budget', {
        budget: { budgetName: name('monthly'), budgetType: 'COST', timeUnit: 'MONTHLY', budgetLimit: { amount: props.monthlyBudgetUsd, unit: 'USD' } },
        notificationsWithSubscribers: [50, 80, 100].map((threshold) => ({
          notification: { notificationType: 'ACTUAL', comparisonOperator: 'GREATER_THAN', threshold, thresholdType: 'PERCENTAGE' },
          subscribers: [{ subscriptionType: 'EMAIL', address: props.alarmEmail! }],
        })),
      });
    }

    // ---------- Outputs ----------
    const out = (id: string, value: string, description: string) => new CfnOutput(this, id, { value, description });
    out('ChatUrl', `https://${props.domain?.name ?? distribution.distributionDomainName}`, 'Open with ?mode=fullscreen, or embed loader.js');
    out('DistributionId', distribution.distributionId, 'CloudFront distribution');
    out('KillSwitchParameter', control.parameterName, 'CONCIERGE_CONTROL_PARAM for pnpm kill-switch');
    out('StaffCodeSecret', staffCode.secretArn, 'Staff mode passcode');
    out('SessionsTable', sessions.tableName, 'Ephemeral table');
    out('RecordsTable', records.tableName, 'Records table');
    out('ApiFunction', apiFn.functionName, 'Used by the post-deploy smoke test');
    out('ReviewFunction', reviewFn.functionName, 'Flagged chats for the review role: invoke with {"action":"list"} or {"action":"get","id":"..."}');
    out('AlarmTopic', topic.topicArn, 'Alarm notifications');
    if (identity && props.sesIdentity && 'domain' in props.sesIdentity) {
      out('DkimRecords', [identity.dkimDnsTokenName1, identity.dkimDnsTokenName2, identity.dkimDnsTokenName3].join(','), 'CNAME names for the client DNS');
    }
  }
}
