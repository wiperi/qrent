import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import ipaddr from 'ipaddr.js';
import { Agent } from 'undici';
import { z } from 'zod';

export const modelConnection = z.discriminatedUnion('type', [
  z.object({ type: z.literal('local') }),
  z.object({
    type: z.literal('compatible'),
    baseUrl: z.string().trim().max(400).url(),
    model: z
      .string()
      .trim()
      .min(1)
      .max(150)
      .regex(/^[\w.:/@-]+$/),
    apiKey: z
      .string()
      .trim()
      .min(1)
      .max(1024)
      .regex(/^[\x21-\x7e]+$/),
  }),
]);

export class ModelConnectionError extends Error {}

export async function connectModel(connection: z.infer<typeof modelConnection>) {
  const local = connection.type === 'local';
  const rawUrl = local ? process.env.QRENT_LOCAL_MODEL_URL : connection.baseUrl;
  const modelId = local ? process.env.QRENT_LOCAL_MODEL_NAME : connection.model;
  const url = rawUrl && URL.canParse(rawUrl) ? new URL(rawUrl) : undefined;
  if (!url || !modelId || url.username || url.password || url.search || url.hash)
    throw new ModelConnectionError();

  let dispatcher: Agent | undefined;
  if (local) {
    if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1') throw new ModelConnectionError();
  } else {
    if (
      url.protocol !== 'https:' ||
      url.port ||
      isIP(url.hostname) ||
      !url.hostname.includes('.') ||
      url.hostname.startsWith('[')
    )
      throw new ModelConnectionError();

    // Resolve once and pin the public address for the lifetime of this turn.
    // No proxy, redirects, DNS rebinding, or requests to local/private networks.
    const addresses = await lookup(url.hostname, { all: true }).catch(() => []);
    const isPublic = (address: string) => ipaddr.process(address).range() === 'unicast';
    if (!addresses.length || addresses.some(({ address }) => !isPublic(address)))
      throw new ModelConnectionError();
    const { address, family } = addresses.find(item => item.family === 4) ?? addresses[0];
    dispatcher = new Agent({
      autoSelectFamily: false,
      maxResponseSize: 1024 * 1024,
      connect: {
        timeout: 8000,
        lookup: (_host, options, callback) => {
          if (options.all) callback(null, [{ address, family }]);
          else callback(null, address, family);
        },
      },
    });
  }

  const provider = createOpenAICompatible({
    name: 'qrent-compatible',
    baseURL: url.href.replace(/\/+$/, ''),
    apiKey: local ? undefined : connection.apiKey,
    fetch: (input, init) => {
      const target = new URL(input instanceof Request ? input.url : input.toString());
      if (target.origin !== url.origin) throw new ModelConnectionError();
      const options: RequestInit & { dispatcher?: Agent } = {
        ...init,
        redirect: 'error',
        cache: 'no-store',
        ...(dispatcher ? { dispatcher } : {}),
      };
      return fetch(input, options);
    },
    transformRequestBody: body => {
      if (url.hostname !== 'api.openai.com' || !('max_tokens' in body)) return body;
      const { max_tokens, ...rest } = body;
      return { ...rest, max_completion_tokens: max_tokens };
    },
  });

  return { model: provider.chatModel(modelId), close: () => dispatcher?.destroy() };
}
