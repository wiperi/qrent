import { pageMetadata } from '@/lib/seo';
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return pageMetadata(
    locale,
    '/favorite',
    locale === 'zh' ? '我的收藏 | QRent' : 'Saved Rentals | QRent',
    locale === 'zh' ? '查看你收藏的租房信息。' : 'View the rental homes you have saved.',
    { index: false }
  );
}
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
