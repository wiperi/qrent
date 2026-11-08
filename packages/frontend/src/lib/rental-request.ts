import { z } from 'zod';

export function rentalPostError(request: Request) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  const secureOrigin = host && 'https://' + host;
  const loopbackOrigin =
    host && /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host) && 'http://' + host;
  if (!origin || (origin !== secureOrigin && origin !== loopbackOrigin))
    return new Response(null, { status: 403 });
  if (request.headers.get('content-type')?.split(';')[0]?.trim() !== 'application/json')
    return new Response(null, { status: 415 });
  return null;
}

export const rentalLocale = z.enum(['en', 'zh']);

export async function readRentalJson(request: Request, limit: number): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder();
  let size = 0;
  let json = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        return null;
      }
      json += decoder.decode(value, { stream: true });
    }
    return JSON.parse(json + decoder.decode());
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}
