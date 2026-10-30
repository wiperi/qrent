import Footer from '@/components/Footer';
import Header from '@/components/Header';
import NotificationBar from '@/components/NotificationBar';
import { AIChatBox, AIChatToggleButton } from '@/components/AIChatBox';
import { MainContentWrapper } from '@/components/MainContentWrapper';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/lib/auth-context';
import AppTRPCProvider from '@/lib/trpc-provider';
import { SITE_URL, SITE_IMAGE, jsonLd } from '@/lib/seo';
import { locales } from '@/i18n';
import { isLocale } from '@qrent/shared/utils/helper';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Analytics } from '@vercel/analytics/next';
import '../globals.css';
import '@/styles/guides.css';

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#ffffff' };
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'QRent — Sydney student rentals',
  description: 'Compare rental prices from Domain and Real Estate around Sydney universities.',
  openGraph: { siteName: 'QRent', images: [SITE_IMAGE] },
  twitter: { card: 'summary_large_image', images: [SITE_IMAGE] },
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'QRent' },
};

export function generateStaticParams() {
  return locales.map(locale => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages({ locale });
  return (
    <html lang={locale === 'zh' ? 'zh-CN' : 'en-AU'}>
      <head>
        <meta name="baidu-site-verification" content="codeva-nsbHswsQeF" />
        <link
          rel="alternate"
          type="application/rss+xml"
          title="QRent rental guides"
          href={`${SITE_URL}/feed.xml`}
        />
        <Script
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=G-LVXN1Q8W0X`}
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-LVXN1Q8W0X');
          `}
        </Script>
        <Script
          id="clarity-analytics"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(c,l,a,r,i,t,y){
                  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "r5zysdcmja");
            `,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              '@id': `${SITE_URL}/#website`,
              name: 'QRent',
              url: SITE_URL,
              inLanguage: ['en-AU', 'zh-CN'],
              description:
                'Free rental comparison around Sydney universities using Domain and Real Estate listings.',
              publisher: {
                '@type': 'Organization',
                '@id': `${SITE_URL}/#organization`,
                name: 'QRent',
                url: SITE_URL,
                logo: SITE_IMAGE,
              },
            }),
          }}
        />
      </head>
      <body className="bg-white text-slate-800 antialiased">
        <NextIntlClientProvider messages={messages} locale={locale}>
          <AppTRPCProvider>
            <AuthProvider>
              <Header />
              <NotificationBar />
              <MainContentWrapper>{children}</MainContentWrapper>
              <Footer />
              <AIChatToggleButton />
              <AIChatBox />
              <Toaster />
            </AuthProvider>
          </AppTRPCProvider>
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
