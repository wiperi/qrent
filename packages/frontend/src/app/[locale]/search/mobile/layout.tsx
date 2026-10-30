import { pageMetadata } from '@/lib/seo';
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return pageMetadata(
    locale,
    '/search/mobile',
    locale === 'zh' ? '移动端租房筛选 | QRent' : 'Mobile Rental Filters | QRent',
    locale === 'zh' ? '在手机上筛选悉尼租房信息。' : 'Filter Sydney rental information on mobile.',
    { index: false }
  );
}
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
