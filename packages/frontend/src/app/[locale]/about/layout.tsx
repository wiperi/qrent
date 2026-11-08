import { pageMetadata } from '@/lib/seo';
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return pageMetadata(
    locale,
    '/about',
    locale === 'zh'
      ? '关于 Qrent｜免费悉尼留学生租房工具'
      : 'About Qrent | Free Sydney Student Rental Search',
    locale === 'zh'
      ? '了解 Qrent 如何整合 Domain 与 Real Estate 房源，并结合大学位置、周租和通勤信息帮助留学生找房。'
      : 'Learn how Qrent combines Domain and Real Estate listings with university locations, weekly prices and commute information for student renters.'
  );
}
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
