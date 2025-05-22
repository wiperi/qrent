// components/FooterHandler.tsx
'use client';
import { usePathname } from 'next/navigation';
import Footer from './Footer';

export default function FooterHandler() {
  const pathname = usePathname();
  const hideFooter = pathname?.endsWith('/findAHome') || pathname?.endsWith('/justLanded');

  return <>{!hideFooter && <Footer />}</>;
}
