import express, { Router, type ErrorRequestHandler } from 'express';
import { z } from 'zod';
import { authStoreCall } from '../../utils/auth-security';
import { isQrentProductionDeployment } from '../../utils/vercel-deployment';

const bucketPrefix = 'qrent:rental-assistant:history:v1:';
const dayMs = 86_400_000;
const retentionDays = 30;
const dailyCapacity = 2000;

const recordId = z.string().regex(/^\d{4}-\d{2}-\d{2}\/[a-f0-9-]{36}$/);
const school = z.enum(['UNSW', 'USYD', 'UTS']);
const source = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('guide'), id: z.string().max(8), path: z.string().max(400) }),
  z.strictObject({
    kind: z.literal('listings'),
    id: z.string().max(8),
    school,
    suburb: z.string().max(80).nullable(),
    matches: z.number().int().nonnegative().nullable(),
    averageWeeklyRent: z.number().nonnegative().nullable(),
    filters: z.strictObject({
      minRent: z.number().optional(),
      maxRent: z.number().optional(),
      bedrooms: z.number().optional(),
      maxCommute: z.number().optional(),
    }),
    examples: z
      .array(
        z.strictObject({
          id: z.number().int().positive(),
          weeklyRent: z.number().positive(),
          commuteMinutes: z.number().nonnegative().nullable(),
        })
      )
      .max(6),
  }),
]);
const outcome = z.discriminatedUnion('status', [
  z.strictObject({
    status: z.literal('answered'),
    answer: z.string().max(3500),
    listingLookupFailed: z.boolean(),
    sources: z.array(source).max(24),
  }),
  z.strictObject({
    status: z.literal('error'),
    code: z.enum([
      'aborted',
      'empty_answer',
      'timeout',
      'invalid_connection',
      'provider_key',
      'provider_limit',
      'provider_model',
      'model_unavailable',
    ]),
  }),
]);
const update = z.discriminatedUnion('phase', [
  z.strictObject({
    phase: z.literal('start'),
    recordId,
    sessionId: z.uuid(),
    locale: z.enum(['en', 'zh']),
    provider: z.enum(['deepseek', 'qwen', 'yuanbao', 'compatible', 'local']),
    question: z.string().min(1).max(3500),
  }),
  z.strictObject({ phase: z.literal('finish'), recordId, outcome }),
  z.strictObject({ phase: z.literal('report'), recordId }),
]);

// All writes for one accepted turn use the same field. Repeated requests cannot
// overwrite a completed answer, and a failed worker leaves a reviewable start.
const writeTurn = [
  "local raw = redis.call('HGET', KEYS[1], ARGV[1])",
  "if ARGV[2] == 'start' then",
  '  if raw then return 1 end',
  "  if redis.call('HLEN', KEYS[1]) >= tonumber(ARGV[5]) then return -1 end",
  "  redis.call('HSET', KEYS[1], ARGV[1], ARGV[3])",
  "  redis.call('EXPIREAT', KEYS[1], ARGV[4])",
  '  return 1',
  'end',
  'if not raw then return 0 end',
  'local turn = cjson.decode(raw)',
  "if ARGV[2] == 'finish' then",
  '  if turn.outcome then return 1 end',
  "  raw = string.sub(raw, 1, -2) .. ',\"outcome\":' .. ARGV[3] .. '}'",
  'else',
  "  if not turn.outcome or turn.outcome.status ~= 'answered' then return 0 end",
  '  if turn.reported then return 1 end',
  '  raw = string.sub(raw, 1, -2) .. \',"reported":true}\'',
  'end',
  "redis.call('HSET', KEYS[1], ARGV[1], raw)",
  'return 1',
].join('\n');

type HistoryStore = {
  isReady?: boolean;
  eval: (script: string, options: { keys: string[]; arguments: string[] }) => Promise<unknown>;
};

export function createRentalAssistantHistoryRouter(
  store: HistoryStore,
  authorize = isQrentProductionDeployment
): Router {
  const router = Router();
  router.post(
    '/',
    async (req, res, next) => {
      res.set('Cache-Control', 'no-store');
      if (!(await authorize(req.get('Authorization')))) {
        res.sendStatus(401);
        return;
      }
      if (!req.is('application/json')) {
        res.sendStatus(415);
        return;
      }
      next();
    },
    express.json({ limit: '40kb' }),
    async (req, res) => {
      const parsed = update.safeParse(req.body);
      if (!parsed.success) {
        res.sendStatus(400);
        return;
      }
      const event = parsed.data;
      const [day, id] = event.recordId.split('/');
      const start = Date.parse(day + 'T00:00:00.000Z');
      const expires = start + retentionDays * dayMs;
      const now = Date.now();
      if (
        !Number.isFinite(start) ||
        new Date(start).toISOString().slice(0, 10) !== day ||
        start > now ||
        expires <= now ||
        (event.phase === 'start' && now - start >= 2 * dayMs)
      ) {
        res.sendStatus(400);
        return;
      }
      const value =
        event.phase === 'start'
          ? {
              recordedAt: new Date(now).toISOString(),
              sessionId: event.sessionId,
              locale: event.locale,
              provider: event.provider,
              question: event.question,
            }
          : event.phase === 'finish'
            ? event.outcome
            : null;
      try {
        const result = await authStoreCall(store, () =>
          store.eval(writeTurn, {
            keys: [bucketPrefix + day],
            arguments: [
              id,
              event.phase,
              JSON.stringify(value),
              String(expires / 1000),
              String(dailyCapacity),
            ],
          })
        );
        res.sendStatus(result === 1 ? 204 : result === -1 ? 429 : 404);
      } catch {
        res.sendStatus(503);
      }
    }
  );
  const parseError: ErrorRequestHandler = (_error, _req, res, _next) => {
    // JSON parser errors can contain the original request body.
    res.sendStatus(400);
  };
  router.use(parseError);
  return router;
}
