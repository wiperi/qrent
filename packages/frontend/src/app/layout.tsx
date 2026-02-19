/**
 * Root layout configuration
 * Sets global metadata/scripts and wraps shared providers
 */
import { AuthProvider } from '@/lib/auth-context';
import AppTRPCProvider from '@/lib/trpc-provider';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';
import { MainContentWrapper } from '@/components/MainContentWrapper';
import { Toaster } from '@/components/ui/toaster';
import { Analytics } from '@vercel/analytics/next';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
};

export const metadata: Metadata = {
  title: 'Qrent - Your Perfect Home Awaits',
  description:
    'Discover exceptional rental properties with ease. Your dream home is just a search away.',
  keywords: 'rental properties, real estate, apartments, houses, rent, leasing, property search',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'QRent',
  },
  openGraph: {
    title: 'Qrent - Your Perfect Home Awaits',
    description: 'Discover exceptional rental properties with ease. Your dream home is just a search away.',
    url: 'https://qrent.rent',
    siteName: 'QRent',
    images: [
      {
        url: 'https://qrent.rent/qrent.jpg',
        width: 1200,
        height: 630,
        alt: 'QRent - Rental Properties',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    title: 'Qrent - Your Perfect Home Awaits',
    description: 'Discover exceptional rental properties with ease. Your dream home is just a search away.',
    card: 'summary_large_image',
    images: ['https://qrent.rent/qrent.jpg'],
  },
  alternates: {
    canonical: 'https://qrent.rent',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="baidu-site-verification" content="codeva-nsbHswsQeF"/>
        {/* Hreflang tags for multilingual SEO */}
        <link rel="alternate" href="https://qrent.rent/en" hrefLang="en" />
        <link rel="alternate" href="https://qrent.rent/zh" hrefLang="zh" />
        <link rel="alternate" href="https://qrent.rent" hrefLang="x-default" />
        <Script
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=G-LVXN1Q8W0X`}
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {
            `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-LVXN1Q8W0X');
          `
          }
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
        {/* Schema.org Structured Data */}
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Website',
              name: 'QRent',
              url: 'https://qrent.rent',
              description: 'Discover exceptional rental properties with ease. Your dream home is just a search away.',
              publisher: {
                '@type': 'Organization',
                name: 'QRent',
                logo: {
                  '@type': 'ImageObject',
                  url: 'https://qrent.rent/qrent-logo.svg',
                  width: 300,
                  height: 60,
                },
              },
              potentialAction: {
                '@type': 'SearchAction',
                target: 'https://qrent.rent/{locale}/search?q={search_term_string}',
                'query-input': 'required name=search_term_string',
              },
            }),
          }}
        />
      </head>
      <body className="bg-white text-slate-800 antialiased">
        <AppTRPCProvider>
          <AuthProvider>
            <MainContentWrapper>{children}</MainContentWrapper>
            <Toaster />
          </AuthProvider>
        </AppTRPCProvider>
        <Analytics />
      </body>
    </html>
  );
}
