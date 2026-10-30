import { pageMetadata } from '@/lib/seo';
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return pageMetadata(
    locale,
    '/contact',
    locale === 'zh'
      ? '联系 QRent｜反馈房源与网站问题'
      : 'Contact QRent | Rental and Website Feedback',
    locale === 'zh'
      ? '联系 QRent 团队，反馈悉尼房源信息、租金、通勤或网站使用问题。'
      : 'Contact the QRent team with feedback about Sydney rental information, prices, commutes or using the website.'
  );
}
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
