import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

export function generateMetadata() {
  notFound();
}
export default async function MissingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  notFound();
}
