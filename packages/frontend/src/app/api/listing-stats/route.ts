import { readListingStats } from '@/lib/listing-stats';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const upstream = await fetch('https://qrent.com.cn/listing-stats.json', {
      cache: 'no-store',
      signal: AbortSignal.timeout(3500),
    });
    if (upstream.ok) {
      const stats = readListingStats(await upstream.json());
      if (stats) {
        return Response.json(stats, {
          headers: { 'Cache-Control': 'public, max-age=15, s-maxage=30' },
        });
      }
    }
  } catch {
    // The homepage can keep showing listings when the statistics origin is unavailable.
  }

  return Response.json(null, { status: 503, headers: { 'Cache-Control': 'no-store' } });
}
