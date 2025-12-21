import Footer from '@/components/Footer';
import Header from '@/components/Header';
import LocaleUpdater from '@/components/LocaleUpdater';
import { AIChatBox, AIChatToggleButton } from '@/components/AIChatBox';
import { WeChatGroupEntry } from '@/components/WeChatGroupEntry';
import { locales } from '@/i18n';
import { AuthProvider } from '@/lib/auth-context';
import AppTRPCProvider from '@/lib/trpc-provider';
import { isLocale } from '@qrent/shared/utils/helper';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params
}: Props) {
  const { locale } = await params;

  // Validate that the incoming `locale` parameter is valid using type-safe guard
  if (!isLocale(locale)) notFound();

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider messages={messages}>
      <LocaleUpdater />
      <Header />
      <AppTRPCProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </AppTRPCProvider>
      <Footer />
      
      {/* AI 聊天框和租房社群入口 */}
      <AIChatBox />
      <AIChatToggleButton />
      <WeChatGroupEntry />
    </NextIntlClientProvider>
  );
}