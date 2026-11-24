// Summaries in the DynamoDB records table (D32). Items are grouped by month (pk "SUMMARY#2026-10",
// sk the conversation ID) and expire through TTL after the client's summaries_months.
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { BatchWriteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { emptyTally, readSeeds, type StoredSummary, type SummaryRepo } from './store.ts';
import { URGENT_KINDS, type Summary, type UrgentKind } from './types.ts';

const pk = (month: string) => `SUMMARY#${month}`;
// One counter item per calendar year (pk "TALLY#2026", sk "urgent"). No expiresAt, so TTL never
// removes it; it holds counts only.
const tallyKey = (year: string) => ({ pk: `TALLY#${year}`, sk: 'urgent' });

function previousMonth(month: string): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

export class DynamoSummaryRepo implements SummaryRepo {
  private readonly db: DynamoDBDocumentClient;

  constructor(
    private readonly table: string,
    private readonly keepMonths: number,
    private readonly currentMonth: () => string,
    client = new DynamoDBClient({}),
  ) {
    this.db = DynamoDBDocumentClient.from(client);
  }

  private item(summary: Summary, reported: boolean) {
    return {
      pk: pk(summary.month),
      sk: summary.conversation_id,
      data: JSON.stringify(summary),
      reported,
      expiresAt: Math.floor(Date.now() / 1000) + this.keepMonths * 31 * 86_400,
    };
  }

  async add(summary: Summary) {
    await this.db.send(new PutCommand({ TableName: this.table, Item: this.item(summary, false) }));
  }

  private async query(month: string, onlyUnreported: boolean): Promise<StoredSummary[]> {
    const out: StoredSummary[] = [];
    let start: Record<string, unknown> | undefined;
    do {
      const r = await this.db.send(
        new QueryCommand({
          TableName: this.table,
          KeyConditionExpression: 'pk = :pk',
          ...(onlyUnreported ? { FilterExpression: 'reported = :no' } : {}),
          ExpressionAttributeValues: { ':pk': pk(month), ...(onlyUnreported ? { ':no': false } : {}) },
          ExclusiveStartKey: start,
        }),
      );
      for (const i of r.Items ?? []) out.push({ summary: JSON.parse(String(i.data)) as Summary, reportedWeekly: i.reported === true });
      start = r.LastEvaluatedKey;
    } while (start);
    return out;
  }

  async inMonth(month: string) {
    return (await this.query(month, false)).map((s) => s.summary);
  }

  // The weekly report looks back over this month and last, which covers any week.
  async unreported() {
    const month = this.currentMonth();
    return [...(await this.query(previousMonth(month), true)), ...(await this.query(month, true))];
  }

  async markReported(items: StoredSummary[]) {
    for (const { summary } of items) {
      await this.db.send(
        new UpdateCommand({
          TableName: this.table,
          Key: { pk: pk(summary.month), sk: summary.conversation_id },
          UpdateExpression: 'SET reported = :yes',
          ExpressionAttributeValues: { ':yes': true },
        }),
      );
    }
  }

  async countUrgent(year: string, kinds: UrgentKind[]) {
    if (!kinds.length) return;
    await this.db.send(
      new UpdateCommand({
        TableName: this.table,
        Key: tallyKey(year),
        UpdateExpression: `ADD ${kinds.map((_, i) => `#k${i} :one${i}`).join(', ')}`,
        ExpressionAttributeNames: Object.fromEntries(kinds.map((k, i) => [`#k${i}`, k])),
        ExpressionAttributeValues: Object.fromEntries(kinds.map((_, i) => [`:one${i}`, 1])),
      }),
    );
  }

  async urgentTally(year: string) {
    const r = await this.db.send(new GetCommand({ TableName: this.table, Key: tallyKey(year) }));
    const t = emptyTally();
    for (const k of URGENT_KINDS) if (typeof r.Item?.[k] === 'number') t[k] = r.Item[k] as number;
    return t;
  }

  async seedDemo(seedFile: string, clientId: string, month: string) {
    if ((await this.query(month, false)).length) return 0;
    const seeds = readSeeds(seedFile, clientId, month);
    for (let i = 0; i < seeds.length; i += 25) {
      const batch = seeds.slice(i, i + 25).map((s) => ({ PutRequest: { Item: this.item(s, false) } }));
      await this.db.send(new BatchWriteCommand({ RequestItems: { [this.table]: batch } }));
    }
    return seeds.length;
  }
}
