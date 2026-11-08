import { randomUUID } from 'node:crypto';
import type { AssistantEvidence, ModelConnection } from './contracts';

const redaction = '[redacted]';
const endpoint = 'https://api.qrent.rent/api/rental-assistant-history';

export function redactCredentials(value: string, key?: string) {
  return (key ? value.replaceAll(key, redaction) : value)
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, 'Bearer ' + redaction)
    .replace(
      /((?:api[\s_-]*key|access[\s_-]*token|password|密钥|密码)\s*["']?\s*[:=：]\s*["']?)[A-Za-z0-9._~+/=-]{6,}/gi,
      '$1' + redaction
    )
    .replace(/\b(?:sk-[\w-]{12,}|AKID\w{13,}|AIza[\w-]{20,}|gh[pousr]_\w{20,})\b/g, redaction);
}

function transcriptText(value: string, key?: string) {
  return redactCredentials(value, key)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, redaction)
    .replace(/(?<!\d)(?:\+?61[\s.-]*|0)4(?:[\s.-]*\d){8}(?!\d)/g, redaction)
    .replace(/(?<!\d)(?:\+86[\s.-]*)?1[3-9]\d{9}(?!\d)/g, redaction)
    .slice(0, 3500);
}

type Outcome =
  | {
      status: 'answered';
      answer: string;
      evidence: AssistantEvidence[];
      listingLookupFailed: boolean;
    }
  | {
      status: 'error';
      code:
        | 'aborted'
        | 'empty_answer'
        | 'timeout'
        | 'invalid_connection'
        | 'provider_key'
        | 'provider_limit'
        | 'provider_model'
        | 'model_unavailable';
    };

export type ChatHistoryError = Extract<Outcome, { status: 'error' }>['code'];

export const historyIdPattern = /^\d{4}-\d{2}-\d{2}\/[a-f0-9-]{36}$/;

function writeHistory(request: Request, event: object) {
  const token = request.headers.get('x-vercel-oidc-token');
  if (!token) throw new Error('Missing deployment identity');
  return fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify(event),
    cache: 'no-store',
    redirect: 'error',
    // A tab can close or stop generation before the failure is recorded.
    signal: AbortSignal.timeout(2500),
  });
}

export async function startChatHistory(
  request: Request,
  input: { sessionId?: string; locale: 'zh' | 'en'; connection: ModelConnection; question: string }
) {
  if (process.env.VERCEL_ENV !== 'production') return undefined;
  const { sessionId, locale, connection, question } = input;
  const key = connection.type === 'local' ? undefined : connection.apiKey;
  const recordId = new Date().toISOString().slice(0, 10) + '/' + randomUUID();
  const start = await writeHistory(request, {
    phase: 'start',
    recordId,
    sessionId: sessionId ?? randomUUID(),
    locale,
    provider: connection.type === 'preset' ? connection.provider : connection.type,
    question: transcriptText(question, key),
  });
  if (start.status !== 204) throw new Error('History start unavailable');

  return {
    recordId,
    async finish(outcome: Outcome) {
      const result =
        outcome.status === 'error'
          ? outcome
          : {
              status: outcome.status,
              answer: transcriptText(outcome.answer, key),
              listingLookupFailed: outcome.listingLookupFailed,
              sources: outcome.evidence.slice(0, 24).map(source =>
                source.kind === 'guide'
                  ? { kind: source.kind, id: source.id, path: redactCredentials(source.path, key) }
                  : {
                      kind: source.kind,
                      id: source.id,
                      school: source.school,
                      suburb: source.suburb && redactCredentials(source.suburb, key),
                      matches: source.matches,
                      averageWeeklyRent: source.averageWeeklyRent,
                      filters: source.filters,
                      examples: source.examples.slice(0, 6).map(row => ({
                        id: row.id,
                        weeklyRent: row.weeklyRent,
                        commuteMinutes: row.commuteMinutes,
                      })),
                    }
              ),
            };
      const response = await writeHistory(request, { phase: 'finish', recordId, outcome: result });
      if (response.status !== 204) throw new Error('History completion unavailable');
    },
  };
}

export async function reportChatAnswer(request: Request, recordId: string) {
  const response = await writeHistory(request, { phase: 'report', recordId });
  return response.status === 204;
}
