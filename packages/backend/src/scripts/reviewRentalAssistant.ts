import { createClient } from 'redis';
import { parseArgs } from 'node:util';

const bucketPrefix = 'qrent:rental-assistant:history:v1:';

type Turn = {
  recordedAt: string;
  sessionId: string;
  reported?: boolean;
  outcome?: {
    status: 'answered' | 'error';
    listingLookupFailed?: boolean;
    sources?: unknown[];
  };
};

async function main() {
  const { values } = parseArgs({
    options: {
      day: { type: 'string', default: new Date().toISOString().slice(0, 10) },
      record: { type: 'string' },
      session: { type: 'string' },
    },
  });
  const { day, record, session } = values;
  const idPattern = /^[a-f0-9-]{36}$/;
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
    (record && !idPattern.test(record)) ||
    (session && !idPattern.test(session)) ||
    (record && session)
  )
    throw new Error('Invalid review selector');

  if (!process.env.REDIS_URL) throw new Error('Private store is not configured');
  const client = createClient({ url: process.env.REDIS_URL, socket: { reconnectStrategy: false } });
  client.on('error', () => {});
  await client.connect();
  try {
    const key = bucketPrefix + day;
    if (record) {
      const value = await client.hGet(key, record);
      process.stdout.write(value ? value + '\n' : 'Record not found\n');
      return;
    }

    const counts = {
      total: 0,
      reported: 0,
      errors: 0,
      unfinished: 0,
      listingFailures: 0,
      noSources: 0,
    };
    const selected: { id: string; turn: Turn }[] = [];
    const candidates: { id: string; reasons: string[]; recordedAt: string }[] = [];
    const unfinishedBefore = Date.now() - 120_000;
    const seen = new Set<string>();
    for await (const page of client.hScanIterator(key, { COUNT: 100 })) {
      for (const { field: id, value } of page) {
        if (seen.has(id)) continue;
        seen.add(id);
        const turn: Turn = JSON.parse(value);
        if (session) {
          if (turn.sessionId === session) selected.push({ id, turn });
          continue;
        }
        counts.total++;
        const reasons = [];
        if (turn.reported) {
          counts.reported++;
          reasons.push('reported');
        }
        if (turn.outcome?.status === 'error') {
          counts.errors++;
          reasons.push('error');
        }
        if (!turn.outcome && Date.parse(turn.recordedAt) < unfinishedBefore) {
          counts.unfinished++;
          reasons.push('unfinished');
        }
        if (turn.outcome?.listingLookupFailed) {
          counts.listingFailures++;
          reasons.push('listing_lookup');
        }
        if (turn.outcome?.status === 'answered' && !turn.outcome.sources?.length) {
          counts.noSources++;
          reasons.push('no_sources');
        }
        if (reasons.length) candidates.push({ id, reasons, recordedAt: turn.recordedAt });
      }
    }
    const byTime = (a: { recordedAt: string }, b: { recordedAt: string }) =>
      a.recordedAt.localeCompare(b.recordedAt);
    const result = session
      ? { day, turns: selected.sort((a, b) => byTime(a.turn, b.turn)) }
      : { day, counts, candidates: candidates.sort(byTime).slice(-30) };
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } finally {
    await client.close();
  }
}

void main().catch(() => {
  console.error('Could not read the private Little Q history store.');
  process.exitCode = 1;
});
