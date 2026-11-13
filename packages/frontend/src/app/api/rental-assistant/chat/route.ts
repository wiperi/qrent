import { APICallError } from 'ai';
import { z } from 'zod';
import { runRentalAssistant } from '@/lib/rental-assistant/agent';
import type { ChatReply } from '@/lib/rental-assistant/contracts';
import {
  redactCredentials,
  startChatHistory,
  type ChatHistoryError,
} from '@/lib/rental-assistant/history';
import { searchContextInput } from '@/lib/rental-assistant/search-context';
import { connectModel, modelConnection, ModelConnectionError } from '@/lib/rental-assistant/model';
import { rentalLocale, rentalPostError, readRentalJson } from '@/lib/rental-request';
import { reserveAssistantTurn } from '@/lib/rental-assistant/traffic';

export const maxDuration = 60;

const chatInput = z.object({
  locale: rentalLocale,
  sessionId: z.string().uuid().optional(),
  connection: z.unknown(),
  previousSearch: searchContextInput.optional(),
  letterType: z.enum(['cover', 'parent']).optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().trim().min(1).max(3500),
      })
    )
    .min(1)
    .max(7)
    .refine(messages => messages.at(-1)?.role === 'user'),
});

function errorResponse(code: string, status: number) {
  return Response.json({ code }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const denied = rentalPostError(request);
  if (denied) return denied;
  const parsed = chatInput.safeParse(await readRentalJson(request, 60000));
  if (!parsed.success) return errorResponse('invalid_request', 400);

  const {
    connection: configured,
    locale,
    sessionId,
    messages: received,
    previousSearch,
    letterType: requestedLetter,
  } = parsed.data;
  const credential = request.headers
    .get('authorization')
    ?.match(/^Bearer ([\x21-\x7e]{1,1024})$/)?.[1];
  const selection = modelConnection.safeParse(
    credential && configured && typeof configured === 'object' && !('apiKey' in configured)
      ? { ...configured, apiKey: credential }
      : configured
  );
  if (!selection.success) return errorResponse('invalid_request', 400);
  const connection = selection.data;
  const modelKey = connection.type === 'local' ? undefined : connection.apiKey;
  const redact = (value: string) =>
    redactCredentials(value, modelKey && modelKey.length >= 8 ? modelKey : undefined);
  const messages = received.map(message => ({ ...message, content: redact(message.content) }));
  const deadline = AbortSignal.timeout(52_000);
  const signal = AbortSignal.any([request.signal, deadline]);
  const release = reserveAssistantTurn(request);
  if (!release) return errorResponse('rate_limit', 429);
  let history: Awaited<ReturnType<typeof startChatHistory>>;
  try {
    history = await startChatHistory(request, {
      sessionId,
      locale,
      connection,
      question: received.at(-1)!.content,
    });
  } catch {
    release();
    console.warn('Little Q could not save the start of a turn.');
    return errorResponse('history_unavailable', 503);
  }

  async function complete(
    response: Response,
    outcome: Parameters<NonNullable<typeof history>['finish']>[0]
  ) {
    if (!history) return response;
    try {
      await history.finish(outcome);
      response.headers.set('x-qrent-history-id', history.recordId);
      return response;
    } catch {
      console.warn('Little Q could not save the outcome of a turn.');
      return errorResponse('history_unavailable', 503);
    }
  }

  function fail(code: ChatHistoryError, status: number) {
    return complete(errorResponse(code, status), { status: 'error', code });
  }
  let model: Awaited<ReturnType<typeof connectModel>> | undefined;
  try {
    model = await connectModel(connection);
    const { answer, evidence, search, letterType, modelId, listingLookupFailed } =
      await runRentalAssistant({
        model: model.model,
        messages,
        previousSearch,
        requestedLetter,
        locale,
        signal,
        redact,
      });
    if (!answer && !evidence.length) return await fail('empty_answer', 502);
    const reply: ChatReply = {
      answer: answer.slice(0, 3500),
      evidence,
      search,
      letterType,
      modelId,
      reviewId: history?.recordId,
    };
    return await complete(Response.json(reply, { headers: { 'Cache-Control': 'no-store' } }), {
      status: 'answered',
      answer: reply.answer,
      evidence,
      listingLookupFailed,
    });
  } catch (error) {
    if (request.signal.aborted) return await fail('aborted', 499);
    if (deadline.aborted) return await fail('timeout', 504);
    if (error instanceof ModelConnectionError) return await fail('invalid_connection', 400);
    if (APICallError.isInstance(error)) {
      if ([401, 403].includes(error.statusCode ?? 0)) return await fail('provider_key', 401);
      if (error.statusCode === 429) return await fail('provider_limit', 429);
      if ([400, 404, 422].includes(error.statusCode ?? 0)) return await fail('provider_model', 422);
    }
    return await fail('model_unavailable', 502);
  } finally {
    release();
    await model?.close()?.catch(() => {});
  }
}
