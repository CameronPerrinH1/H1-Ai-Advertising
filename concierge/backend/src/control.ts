// Kill switch (D43, build plan 12.6). Pausing shows every visitor "Chat is unavailable right now"
// with the phone number and booking link, within a minute and without a redeploy.
// Locally the switch is a file in .local-data/; deployed, it's an SSM parameter the ops role can flip.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { GetParameterCommand, PutParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { LOCAL_DATA_DIR } from './summary/store.ts';
import { log } from './log.ts';

export interface Control {
  paused(): Promise<boolean>;
  setPaused(paused: boolean): Promise<void>;
}

// A cached read. If the switch can't be read, the last known value stands, so a hiccup in reading
// the switch never takes the chat down on its own.
abstract class CachedControl implements Control {
  private value = false;
  private readAt = 0;
  constructor(private readonly ttlMs: number) {}

  async paused(): Promise<boolean> {
    if (Date.now() - this.readAt < this.ttlMs) return this.value;
    try {
      this.value = await this.read();
    } catch (err) {
      log('control_read_failed', { error: (err as Error)?.name ?? 'Error' });
    }
    this.readAt = Date.now();
    return this.value;
  }

  async setPaused(paused: boolean): Promise<void> {
    await this.write(paused);
    this.value = paused;
    this.readAt = Date.now();
  }

  protected abstract read(): Promise<boolean>;
  protected abstract write(paused: boolean): Promise<void>;
}

export class FileControl extends CachedControl {
  private readonly file: string;
  constructor(clientId: string, dir = LOCAL_DATA_DIR) {
    super(2_000);
    this.file = join(dir, `control-${clientId}.json`);
  }
  protected async read(): Promise<boolean> {
    if (!existsSync(this.file)) return false;
    return (JSON.parse(readFileSync(this.file, 'utf8')) as { paused?: boolean }).paused === true;
  }
  protected async write(paused: boolean): Promise<void> {
    mkdirSync(dirname(this.file), { recursive: true });
    writeFileSync(this.file, JSON.stringify({ paused, changedAt: new Date().toISOString() }));
  }
}

// The parameter holds "paused" or "running". A 30-second cache keeps the switch under a minute.
export class SsmControl extends CachedControl {
  private readonly ssm = new SSMClient({});
  constructor(private readonly name: string) {
    super(30_000);
  }
  protected async read(): Promise<boolean> {
    const r = await this.ssm.send(new GetParameterCommand({ Name: this.name }));
    return r.Parameter?.Value === 'paused';
  }
  protected async write(paused: boolean): Promise<void> {
    await this.ssm.send(new PutParameterCommand({ Name: this.name, Value: paused ? 'paused' : 'running', Type: 'String', Overwrite: true }));
  }
}

export function controlFromEnv(clientId: string): Control {
  const param = process.env.CONCIERGE_CONTROL_PARAM;
  return param ? new SsmControl(param) : new FileControl(clientId);
}
