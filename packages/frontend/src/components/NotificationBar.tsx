'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { HiInformationCircle } from 'react-icons/hi';

export default function NotificationBar() {
  const t = useTranslations('NotificationBar');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  // 获取所有通知消息
  const notifications = [
    t('message1'),
    t('message2'),
    t('message3'),
  ].filter(msg => msg && msg.trim() !== ''); // 过滤掉空消息

  useEffect(() => {
    if (notifications.length <= 1 || isExpanded) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % notifications.length);
    }, 5000); // 每5秒切换一次

    return () => clearInterval(interval);
  }, [notifications.length, isExpanded]);

  if (notifications.length === 0) {
    return null; // 如果没有消息，不显示通知栏
  }

  return (
    <div className="mb-2 sm:mb-3">
      <div className="max-w-7xl mx-auto px-5">
        <div
          className="relative flex items-center justify-center py-3 px-4 sm:px-6 gap-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {/* 图标 */}
          <HiInformationCircle className="flex-shrink-0 w-5 h-5" />

          {/* 消息内容 */}
          <div className="flex-1 text-center overflow-hidden">
            <p
              className={`text-sm transition-all duration-300 ${
                isExpanded
                  ? 'whitespace-normal'
                  : 'truncate whitespace-nowrap'
              }`}
            >
              {notifications[currentIndex]}
            </p>
          </div>

          {/* 指示器 (只在有多条消息时显示) */}
          {notifications.length > 1 && (
            <div className="flex-shrink-0 flex gap-1.5">
              {notifications.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(index);
                  }}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === currentIndex
                      ? 'bg-white w-4'
                      : 'bg-white/50 hover:bg-white/70'
                  }`}
                  aria-label={`查看通知 ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
