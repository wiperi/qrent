export interface RentalPreviewRow {
  id: number;
  address: string;
  region: string;
  price: number;
  url: string;
  bedroomCount?: number;
  bathroomCount?: number;
  commuteTime?: number;
}

export function validPreviewRow(row: RentalPreviewRow): boolean {
  try {
    const url = new URL(row.url);
    return (
      Number.isFinite(row.id) &&
      !!row.address &&
      !!row.region &&
      Number.isFinite(row.price) &&
      row.price > 0 &&
      url.protocol === 'https:' &&
      ['www.domain.com.au', 'www.realestate.com.au', 'domain.com.au', 'realestate.com.au'].includes(
        url.hostname
      )
    );
  } catch {
    return false;
  }
}

// Public read-only inventory. This endpoint never invokes a model or transit API.
export async function getRentalPreview(
  school: string,
  locale: string
): Promise<RentalPreviewRow[] | null> {
  const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.qrent.rent';
  const input = {
    targetSchool: school,
    page: 1,
    pageSize: 8,
    orderBy: [{ publishedAt: 'desc' }, { averageScore: 'desc' }],
  };
  try {
    const response = await fetch(
      `${base}/trpc/properties.search?input=${encodeURIComponent(JSON.stringify(input))}`,
      {
        headers: { 'x-locale': locale },
        next: { revalidate: 600 },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!response.ok) return null;
    const rows = (await response.json())?.result?.data?.properties;
    return Array.isArray(rows) ? rows.filter(validPreviewRow).slice(0, 8) : null;
  } catch {
    return null;
  }
}
