import { pageMetadata } from '@/lib/seo';
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return pageMetadata(
    locale,
    '/team',
    locale === 'zh' ? 'Qrent 团队｜澳洲留学生租房项目' : 'The Qrent Team | Student Rental Project',
    locale === 'zh'
      ? '认识开发和维护 Qrent 的团队，了解这个免费澳洲留学生租房项目。'
      : 'Meet the people developing and maintaining Qrent, a free Australian rental comparison project for students.'
  );
}
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
