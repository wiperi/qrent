'use client';

import { useAIChatStore } from '@/lib/ai-chat-store';
import { useEffect, useState } from 'react';

/**
 * Main content wrapper that adjusts its layout when AI chat is open
 * On desktop: adds right margin to prevent content from being covered by chat
 * On mobile: no adjustment needed (chat is fullscreen overlay)
 */
export function MainContentWrapper({ children }: { children: React.ReactNode }) {
  const { isOpen, width } = useAIChatStore();
  const [isMobile, setIsMobile] = useState(false);

  // Detect if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate margin based on chat width (desktop only)
  const marginRight = isOpen && !isMobile ? `${width}%` : '0';

  return (
    <div
      className="transition-all duration-300 ease-in-out"
      style={{
        marginRight,
        minWidth: isMobile ? '100%' : isOpen ? '300px' : '100%',
      }}
    >
      {children}
    </div>
  );
}
