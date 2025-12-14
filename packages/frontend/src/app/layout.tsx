import { AuthProvider } from '@/lib/auth-context';
import AppTRPCProvider from '@/lib/trpc-provider';
import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { AIChatBox, AIChatToggleButton } from '@/components/AIChatBox';
import { MainContentWrapper } from '@/components/MainContentWrapper';
import { Analytics } from '@vercel/analytics/next';

export const metadata: Metadata = {
  title: 'Qrent - Your Perfect Home Awaits',
  description:
    'Discover exceptional rental properties with ease. Your dream home is just a search away.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
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
      </head>
      <body className="bg-white text-slate-800 antialiased">
        <AppTRPCProvider>
          <AuthProvider>
            <MainContentWrapper>{children}</MainContentWrapper>
            <AIChatToggleButton />
            <AIChatBox />
          </AuthProvider>
        </AppTRPCProvider>
        <Analytics />
      </body>
    </html>
  );
}
