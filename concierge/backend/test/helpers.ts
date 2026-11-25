import type { ConverseCommandInput, ConverseCommandOutput, ContentBlock } from '@aws-sdk/client-bedrock-runtime';
import { loadClient } from '../src/config/load.ts';
import { Catalog } from '../src/catalog.ts';
import { createSession } from '../src/session/store.ts';
import type { ModelClient } from '../src/model/bedrock.ts';

process.env.CONCIERGE_SILENT = '1';

export const catalog = new Catalog(loadClient('glow-med-spa'));
export const TODAY = '2026-10-23'; // fall-peel-2026 is active; holiday-hydrafacial-2026 isn't yet

export function newSession(lang: 'en' | 'es' = 'en') {
  return createSession({ lang, noticeVersion: '2026-10-23.1' }).session;
}

type Step = { content: ContentBlock[]; stop?: 'end_turn' | 'tool_use' | 'max_tokens' };

// A scripted model: returns each step in order and records what it was sent.
export function scriptedModel(steps: Step[]): ModelClient & { calls: ConverseCommandInput[] } {
  const calls: ConverseCommandInput[] = [];
  let i = 0;
  return {
    calls,
    async converse(input) {
      calls.push(structuredClone(input));
      const step = steps[Math.min(i++, steps.length - 1)]!;
      return {
        output: { message: { role: 'assistant', content: step.content } },
        stopReason: step.stop ?? 'end_turn',
        usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
        metrics: { latencyMs: 1 },
        $metadata: {},
      } as ConverseCommandOutput;
    },
  };
}

export const text = (t: string): ContentBlock => ({ text: t });
export const toolUse = (name: string, input: unknown, id = `tu_${name}`): ContentBlock => ({ toolUse: { toolUseId: id, name, input: input as never } });
