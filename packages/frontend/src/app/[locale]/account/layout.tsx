import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return pageMetadata(
    locale,
    '/account',
    locale === 'zh' ? '账户设置 | QRent' : 'Account settings | QRent',
    locale === 'zh'
      ? '管理 QRent 账户和邮箱验证。'
      : 'Manage your QRent account and email verification.',
    { index: false }
  );
}

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
