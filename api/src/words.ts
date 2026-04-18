import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { BlobServiceClient } from '@azure/storage-blob';
import { parse } from 'csv-parse/sync';
import { getUserFromRequest } from './utils/auth.js';
import { readFile } from 'fs/promises';
import path from 'path';

interface WordRow {
  id: string;
  english: string;
  hungarian: string;
  exampleSentence: string;
  dateAdded: string;
  index: number;
}

// Simple in-memory cache with 5-minute TTL
let cachedWords: WordRow[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

function wordId(english: string): string {
  return english.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

async function fetchWords(): Promise<WordRow[]> {
  const now = Date.now();
  if (cachedWords && now - cacheTime < CACHE_TTL) return cachedWords;

  const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING!;
  let csv: string;

  if (connStr === 'UseDevelopmentStorage=true') {
    const localPath = process.env.WORDS_LOCAL_PATH ?? path.resolve(process.cwd(), '../vocabulary.csv');
    csv = await readFile(localPath, 'utf-8');
  } else {
    const container = process.env.WORDS_BLOB_CONTAINER ?? 'words';
    const blobName = process.env.WORDS_BLOB_NAME ?? 'vocabulary.csv';
    const client = BlobServiceClient.fromConnectionString(connStr);
    const containerClient = client.getContainerClient(container);
    const blobClient = containerClient.getBlobClient(blobName);
    const download = await blobClient.download();
    const chunks: Buffer[] = [];
    for await (const chunk of download.readableStreamBody as NodeJS.ReadableStream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as unknown as Uint8Array));
    }
    csv = Buffer.concat(chunks).toString('utf-8');
  }

  const records = parse(csv, {
    columns: ['english', 'hungarian', 'exampleSentence', 'dateAdded'],
    skip_empty_lines: true,
    from_line: 1,
    trim: true,
    relax_quotes: true,
  }) as Array<{ english: string; hungarian: string; exampleSentence: string; dateAdded: string }>;

  cachedWords = records.map((r, i) => ({
    id: wordId(r.english),
    english: r.english,
    hungarian: r.hungarian,
    exampleSentence: r.exampleSentence ?? '',
    dateAdded: r.dateAdded ?? '',
    index: i,
  }));
  cacheTime = now;
  return cachedWords;
}

export async function getWords(
  req: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const user = getUserFromRequest(req);
  if (!user) return { status: 401, body: 'Unauthorized' };

  try {
    const words = await fetchWords();
    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(words),
    };
  } catch (err) {
    context.error('getWords failed', err);
    return { status: 500, body: 'Failed to load word list' };
  }
}

app.http('words', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'words',
  handler: getWords,
});
