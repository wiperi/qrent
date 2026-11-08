import { z } from 'zod';
import { rentalLocale, rentalPostError, readRentalJson } from '@/lib/rental-request';

const submission = z.object({
  email: z.string().trim().max(254).email(),
  locale: rentalLocale,
});

function json(value: Record<string, string>, status: number) {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const denied = rentalPostError(request);
  if (denied) return denied;
  const parsed = submission.safeParse(await readRentalJson(request, 2048));
  if (!parsed.success) return json({ code: 'invalid_email' }, 400);

  try {
    const backend =
      process.env.QRENT_RENTAL_ALERTS_BACKEND_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      'https://api.qrent.rent';
    const response = await fetch(new URL('/api/rental-alerts/interest', backend), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(7000)]),
    });
    if (response.status === 201 && (await response.json()).status === 'registered')
      return json({ status: 'registered' }, 201);
    if (response.status === 429) return json({ code: 'rate_limit' }, 429);
  } catch {
    // Do not expose the backend response or log the submitted email.
  }
  return json({ code: 'storage_unavailable' }, 503);
}
