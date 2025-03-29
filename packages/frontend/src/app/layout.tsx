import type { Metadata } from 'next';
import './styles/globals.css';
export const metadata: Metadata = {
  title: 'Qrent',
  description: 'Your Smart Rental Assistent',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
