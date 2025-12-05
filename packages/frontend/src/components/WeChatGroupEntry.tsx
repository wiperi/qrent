'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { FiUsers } from 'react-icons/fi';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

export function WeChatGroupEntry() {
  const pathname = usePathname();
  const [isHovered, setIsHovered] = useState(false);

  // 只在首页显示
  const isHomePage = pathname === '/' || /^\/[a-z]{2}$/.test(pathname);

  if (!isHomePage) return null;

  return (
    <div
      className={cn(
        'fixed z-[70] transition-all',
        // Mobile: 在AI按钮上方
        'bottom-[88px] right-6',
        // Desktop: 在AI按钮下方
        'md:bottom-auto md:top-[120px] md:right-8',
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 主按钮 */}
      <Button
        size="icon"
        variant="secondary"
        className={cn(
          'shadow-lg transition-all hover:scale-110',
          'h-12 w-12 md:h-14 md:w-14',
          'bg-green-600 hover:bg-green-700 text-white'
        )}
        aria-label="租房社群"
      >
        <FiUsers className="h-6 w-6" />
      </Button>

      {/* 悬停显示的二维码卡片 */}
      {isHovered && (
        <div
          className={cn(
            'absolute right-[60px] top-0 md:right-[70px]',
            'min-w-[280px] rounded-lg bg-white p-4 shadow-2xl',
            'border-2 border-green-600',
            'animate-in fade-in slide-in-from-right-5 duration-200'
          )}
        >
          {/* 箭头 */}
          <div className="absolute -right-2 top-6 h-4 w-4 rotate-45 border-r-2 border-t-2 border-green-600 bg-white" />
          
          {/* 标题 */}
          <div className="mb-3 text-center">
            <h3 className="text-lg font-bold text-gray-800">租房社群</h3>
            <p className="mt-1 text-sm text-gray-600">
              扫码进群即可免费领取全流程租房手册
            </p>
          </div>

          {/* 二维码 */}
          <div className="flex justify-center">
            <img
              src="/wechat-qrcode.png"
              alt="微信群二维码"
              className="h-48 w-48 rounded-lg border-2 border-gray-200"
            />
          </div>

          {/* 备注提示 */}
          <p className="mt-2 text-center text-xs text-red-600 font-medium">
            进群请备注: 学校
          </p>

          {/* 提示文字 */}
          <p className="mt-1 text-center text-xs text-gray-500">
            长按识别二维码加入社群
          </p>
        </div>
      )}
    </div>
  );
}