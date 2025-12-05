/**
 * 主内容布局包装器
 * 当 AI 聊天框打开时自动调整页面布局，桌面端添加右侧边距避免内容被遮挡，移动端无需调整（聊天框为全屏覆盖）
 */
'use client';

import { useAIChatStore } from '@/lib/ai-chat-store';
import { useEffect, useState } from 'react';
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
