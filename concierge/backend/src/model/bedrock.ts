import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ConverseCommandInput,
  type ConverseCommandOutput,
} from '@aws-sdk/client-bedrock-runtime';

export interface ModelClient {
  converse(input: ConverseCommandInput): Promise<ConverseCommandOutput>;
}

// Claude on Bedrock through the Converse API (D2). Credentials come from the default chain
// (`aws login` locally; the Lambda role in deployed stacks).
export function bedrockClient(region = process.env.AWS_REGION ?? 'us-east-1'): ModelClient {
  const client = new BedrockRuntimeClient({ region, maxAttempts: 3 });
  return { converse: (input) => client.send(new ConverseCommand(input)) };
}
