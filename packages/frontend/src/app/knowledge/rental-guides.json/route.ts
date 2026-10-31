import { rentalKnowledgeExport } from '@/lib/rental-library';

export const dynamic = 'force-static';
export function GET() {
  return Response.json(rentalKnowledgeExport(), {
    headers: {
      'Cache-Control': 'public, max-age=0, s-maxage=86400',
      'X-Robots-Tag': 'noindex',
    },
  });
}
