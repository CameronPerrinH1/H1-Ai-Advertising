// Sessions in the DynamoDB ephemeral table (build plan 7.1, D31). The table is encrypted with the
// client's KMS key, keeps a 7-day recovery window, and deletes each item through TTL: 30 days after
// the chat's last activity, or 90 days if the chat was flagged for review (D69).
//
// Item: pk (token hash), data (the session, gzipped JSON), lastActivity, expiresAt (TTL), state
// ("open" or "ended"; removed once summarized, so the by-state index only holds work to do),
// lockedUntil, phones (keyed phone hashes, so an access or deletion request can find it), and for
// flagged chats review ("flagged", the key of the flagged index), reviewFlags, and reviewScores (both
// projected into the index, so listing flagged chats never reads a transcript).
import { ConditionalCheckFailedException, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { createSession, hashToken, IDLE_MS, type FlaggedChat, type ReviewMarks, type Session, type SessionInit, type SessionRepo } from './store.ts';
import type { ReviewFlag, Scores } from '../summary/types.ts';
import { decodeSession, encodeSession } from './codec.ts';

export { decodeSession, encodeSession };

const LOCK_MS = 60_000;
const STATE_INDEX = 'by-state';
export const FLAGGED_INDEX = 'flagged';

export class DynamoSessionRepo implements SessionRepo {
  private readonly db: DynamoDBDocumentClient;

  constructor(
    private readonly table: string,
    private readonly retention: { transcriptDays: number; flaggedDays: number },
    client = new DynamoDBClient({}),
  ) {
    this.db = DynamoDBDocumentClient.from(client);
  }

  private expiresAt(lastActivity: number, days = this.retention.transcriptDays): number {
    return Math.floor(lastActivity / 1000) + days * 86_400;
  }

  async create(init: SessionInit) {
    const created = createSession(init);
    const s = created.session;
    await this.db.send(
      new PutCommand({
        TableName: this.table,
        Item: { pk: s.hash, data: encodeSession(s), state: 'open', lastActivity: s.lastActivity, expiresAt: this.expiresAt(s.lastActivity), audience: s.audience },
        ConditionExpression: 'attribute_not_exists(pk)',
      }),
    );
    return created;
  }

  async get(token: string | undefined) {
    if (!token) return undefined;
    const r = await this.db.send(new GetCommand({ TableName: this.table, Key: { pk: hashToken(token) }, ConsistentRead: true }));
    const item = r.Item;
    if (!item || item.state !== 'open' || Date.now() - Number(item.lastActivity) > IDLE_MS) return undefined;
    return decodeSession(item.data as Uint8Array);
  }

  async lock(session: Session) {
    const now = Date.now();
    try {
      await this.db.send(
        new UpdateCommand({
          TableName: this.table,
          Key: { pk: session.hash },
          UpdateExpression: 'SET lockedUntil = :until',
          ConditionExpression: '#state = :open AND (attribute_not_exists(lockedUntil) OR lockedUntil < :now)',
          ExpressionAttributeNames: { '#state': 'state' },
          ExpressionAttributeValues: { ':until': now + LOCK_MS, ':now': now, ':open': 'open' },
        }),
      );
      return true;
    } catch (err) {
      if (err instanceof ConditionalCheckFailedException) return false;
      throw err;
    }
  }

  async save(session: Session) {
    session.lastActivity = Date.now();
    const phones = session.phoneHashes.size ? { phones: session.phoneHashes } : {};
    try {
      await this.db.send(
        new UpdateCommand({
          TableName: this.table,
          Key: { pk: session.hash },
          UpdateExpression: `SET #data = :data, lastActivity = :last, expiresAt = :exp${phones.phones ? ', phones = :phones' : ''} REMOVE lockedUntil`,
          ConditionExpression: 'attribute_exists(pk)',
          ExpressionAttributeNames: { '#data': 'data' },
          ExpressionAttributeValues: {
            ':data': encodeSession(session),
            ':last': session.lastActivity,
            ':exp': this.expiresAt(session.lastActivity),
            ...(phones.phones ? { ':phones': phones.phones } : {}),
          },
        }),
      );
    } catch (err) {
      if (!(err instanceof ConditionalCheckFailedException)) throw err;
    }
  }

  async end(token: string | undefined) {
    if (!token) return;
    await this.transition(hashToken(token), 'open', 'ended');
  }

  async endIdle(now: number) {
    const cutoff = now - IDLE_MS;
    let n = 0;
    let start: Record<string, unknown> | undefined;
    do {
      const r = await this.db.send(
        new QueryCommand({
          TableName: this.table,
          IndexName: STATE_INDEX,
          KeyConditionExpression: '#state = :open AND lastActivity < :cutoff',
          ExpressionAttributeNames: { '#state': 'state' },
          ExpressionAttributeValues: { ':open': 'open', ':cutoff': cutoff },
          ExclusiveStartKey: start,
        }),
      );
      for (const item of r.Items ?? []) if (await this.transition(String(item.pk), 'open', 'ended', cutoff)) n += 1;
      start = r.LastEvaluatedKey;
    } while (start);
    return n;
  }

  async ended(limit: number) {
    const r = await this.db.send(
      new QueryCommand({
        TableName: this.table,
        IndexName: STATE_INDEX,
        KeyConditionExpression: '#state = :ended',
        ExpressionAttributeNames: { '#state': 'state' },
        ExpressionAttributeValues: { ':ended': 'ended' },
        Limit: limit,
      }),
    );
    const sessions: Session[] = [];
    for (const key of r.Items ?? []) {
      const full = await this.db.send(new GetCommand({ TableName: this.table, Key: { pk: key.pk }, ConsistentRead: true }));
      if (full.Item?.state === 'ended') sessions.push(decodeSession(full.Item.data as Uint8Array));
    }
    return sessions;
  }

  async markSummarized(session: Session, { flags, scores }: ReviewMarks) {
    const flagged = flags.length > 0;
    try {
      await this.db.send(
        new UpdateCommand({
          TableName: this.table,
          Key: { pk: session.hash },
          UpdateExpression: flagged ? 'SET review = :flagged, reviewFlags = :flags, reviewScores = :scores, expiresAt = :exp REMOVE #state' : 'REMOVE #state',
          ConditionExpression: '#state = :ended',
          ExpressionAttributeNames: { '#state': 'state' },
          ExpressionAttributeValues: {
            ':ended': 'ended',
            ...(flagged ? { ':flagged': 'flagged', ':flags': flags, ':scores': scores, ':exp': this.expiresAt(session.lastActivity, this.retention.flaggedDays) } : {}),
          },
        }),
      );
    } catch (err) {
      if (!(err instanceof ConditionalCheckFailedException)) throw err;
    }
  }

  async listFlagged(limit: number): Promise<FlaggedChat[]> {
    const r = await this.db.send(
      new QueryCommand({
        TableName: this.table,
        IndexName: FLAGGED_INDEX,
        KeyConditionExpression: 'review = :flagged',
        // TTL deletion can lag by a few days; expired chats are never shown.
        FilterExpression: 'expiresAt > :now',
        ExpressionAttributeValues: { ':flagged': 'flagged', ':now': Math.floor(Date.now() / 1000) },
        ScanIndexForward: false,
        Limit: limit,
      }),
    );
    return (r.Items ?? []).map((i) => ({
      id: String(i.pk),
      lastActivity: Number(i.lastActivity),
      flags: (i.reviewFlags ?? []) as ReviewFlag[],
      scores: (i.reviewScores ?? null) as Scores | null,
    }));
  }

  async getFlagged(id: string) {
    const r = await this.db.send(new GetCommand({ TableName: this.table, Key: { pk: id }, ConsistentRead: true }));
    const i = r.Item;
    if (!i || i.review !== 'flagged' || Number(i.expiresAt) <= Math.floor(Date.now() / 1000)) return undefined;
    return {
      id,
      lastActivity: Number(i.lastActivity),
      flags: (i.reviewFlags ?? []) as ReviewFlag[],
      scores: (i.reviewScores ?? null) as Scores | null,
      session: decodeSession(i.data as Uint8Array),
    };
  }

  // Moves a session from one state to the next. False if another request got there first.
  private async transition(hash: string, from: string, to: string, idleBefore?: number): Promise<boolean> {
    try {
      await this.db.send(
        new UpdateCommand({
          TableName: this.table,
          Key: { pk: hash },
          UpdateExpression: 'SET #state = :to',
          ConditionExpression: idleBefore === undefined ? '#state = :from' : '#state = :from AND lastActivity < :cutoff',
          ExpressionAttributeNames: { '#state': 'state' },
          ExpressionAttributeValues: { ':from': from, ':to': to, ...(idleBefore === undefined ? {} : { ':cutoff': idleBefore }) },
        }),
      );
      return true;
    } catch (err) {
      if (err instanceof ConditionalCheckFailedException) return false;
      throw err;
    }
  }
}
