import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { TableClient, odata } from '@azure/data-tables';
import { getUserFromRequest } from './utils/auth.js';

interface ProgressEntity {
  partitionKey: string;
  rowKey: string;
  masteryLevel: number;
  timesCorrect: number;
  timesWrong: number;
  lastReviewed: string;
  nextReview: string;
}

interface SessionResult {
  wordId: string;
  direction: string;
  correct: boolean;
  responseTimeMs: number;
}

const MASTERY_INTERVALS_DAYS: Record<number, number> = {
  0: 0, 1: 1, 2: 3, 3: 7, 4: 21,
};

let tableReady = false;

async function getTableClient(): Promise<TableClient> {
  const client = TableClient.fromConnectionString(
    process.env.AZURE_STORAGE_CONNECTION_STRING!,
    'UserProgress',
  );
  if (!tableReady) {
    try { await client.createTable(); } catch { /* already exists */ }
    tableReady = true;
  }
  return client;
}

function nextReviewDate(masteryLevel: number): string {
  const days = MASTERY_INTERVALS_DAYS[masteryLevel] ?? 0;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export async function handleProgress(
  req: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const user = getUserFromRequest(req);
  if (!user) return { status: 401, body: 'Unauthorized' };

  if (req.method === 'GET') {
    try {
      const client = await getTableClient();
      const entities: ProgressEntity[] = [];
      for await (const entity of client.listEntities<ProgressEntity>({
        queryOptions: { filter: odata`PartitionKey eq ${user.userId}` },
      })) {
        entities.push(entity);
      }
      const result = entities.map((e) => ({
        wordId: e.rowKey,
        masteryLevel: e.masteryLevel,
        timesCorrect: e.timesCorrect,
        timesWrong: e.timesWrong,
        lastReviewed: e.lastReviewed,
        nextReview: e.nextReview,
      }));
      return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      };
    } catch (err) {
      context.error('getProgress failed', err);
      return { status: 500, body: 'Failed to load progress' };
    }
  }

  if (req.method === 'PUT') {
    try {
      const results = (await req.json()) as SessionResult[];
      const client = await getTableClient();
      const now = new Date().toISOString();

      // Fetch existing progress for these words
      const existing = new Map<string, ProgressEntity>();
      for await (const entity of client.listEntities<ProgressEntity>({
        queryOptions: { filter: odata`PartitionKey eq ${user.userId}` },
      })) {
        existing.set(entity.rowKey, entity);
      }

      const upserts: Promise<unknown>[] = [];
      for (const result of results) {
        const prev = existing.get(result.wordId);
        const prevMastery = prev?.masteryLevel ?? 0;
        const newMastery = Math.min(4, Math.max(0,
          result.correct ? prevMastery + 1 : prevMastery - 1,
        ));

        const entity: ProgressEntity = {
          partitionKey: user.userId,
          rowKey: result.wordId,
          masteryLevel: newMastery,
          timesCorrect: (prev?.timesCorrect ?? 0) + (result.correct ? 1 : 0),
          timesWrong: (prev?.timesWrong ?? 0) + (result.correct ? 0 : 1),
          lastReviewed: now,
          nextReview: nextReviewDate(newMastery),
        };
        upserts.push(client.upsertEntity(entity, 'Replace'));
      }

      await Promise.all(upserts);
      return { status: 204 };
    } catch (err) {
      context.error('putProgress failed', err);
      return { status: 500, body: 'Failed to save progress' };
    }
  }

  return { status: 405 };
}

app.http('progress', {
  methods: ['GET', 'PUT'],
  authLevel: 'anonymous',
  route: 'progress',
  handler: handleProgress,
});
