import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return pageMetadata(
    locale,
    '/account',
    locale === 'zh' ? '账户设置 | Qrent' : 'Account settings | Qrent',
    locale === 'zh'
      ? '管理 Qrent 账户和邮箱验证。'
      : 'Manage your Qrent account and email verification.',
    { index: false }
  );
}

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
