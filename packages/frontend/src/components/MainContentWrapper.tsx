'use client';

/**
 * Main content wrapper - simplified version that no longer needs to adjust for AI chat
 * The AI chat is now an independent floating window that doesn't affect the main layout
 */
export function MainContentWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div>
      {children}
    </div>
  );
}
