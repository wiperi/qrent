import { z } from 'zod';
import { historyIdPattern, reportChatAnswer } from '@/lib/rental-assistant/history';
import { readRentalJson, rentalPostError } from '@/lib/rental-request';

const input = z.object({ reviewId: z.string().regex(historyIdPattern) }).strict();

export async function POST(request: Request) {
  const denied = rentalPostError(request);
  if (denied) return denied;
  const parsed = input.safeParse(await readRentalJson(request, 256));
  if (!parsed.success) return new Response(null, { status: 400 });
  if (process.env.VERCEL_ENV !== 'production') return new Response(null, { status: 404 });
  try {
    if (await reportChatAnswer(request, parsed.data.reviewId)) {
      return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
    }
  } catch {
    // Never expose the deployment token or backend response.
  }
  return new Response(null, { status: 503, headers: { 'Cache-Control': 'no-store' } });
}
