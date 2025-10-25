'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';
import { FaCheck } from 'react-icons/fa';
import { MdEmail } from 'react-icons/md';
import { SiGithub, SiXiaohongshu } from 'react-icons/si';

export default function Footer() {
  const [showCheckmark, setShowCheckmark] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const t = useTranslations('Footer');
  const locale = useLocale();

  const handleEmailCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await navigator.clipboard.writeText('yyzyfish5@gmail.com');
      setShowCheckmark(true);
      setShowTooltip(true);
      setTimeout(() => {
        setShowCheckmark(false);
        setShowTooltip(false);
      }, 2000); // 2秒后恢复
    } catch (err) {
      console.error('复制失败:', err);
      // 如果复制失败，可以短暂显示错误状态或保持原图标
    }
  };

  return (
    <footer className="border-t border-slate-200 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <nav aria-label="Footer navigation">
            <ul className="space-y-2 text-slate-700">
              <li>
                <Link href={`/${locale}/about`} className="hover:text-blue-600 transition-colors">{t('about')}</Link>
              </li>
              <li>
                <Link href={`/${locale}/team`} className="hover:text-blue-600 transition-colors">{t('meetOurTeam')}</Link>
              </li>
              <li>
                <Link href={`/${locale}/contact`} className="hover:text-blue-600 transition-colors">{t('getInTouch')}</Link>
              </li>
            </ul>
          </nav>

          <div className="flex items-start sm:items-center gap-4">
            <a
              href="https://www.xiaohongshu.com/user/profile/63f617c9000000000f011eb7"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Xiaohongshu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:text-white hover:bg-red-500 hover:border-red-500 transition"
            >
              <SiXiaohongshu className="h-5 w-5" />
            </a>
            <a
              href="https://github.com/wiperi/qrent"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:text-white hover:bg-slate-900 hover:border-slate-900 transition"
            >
              <SiGithub className="h-5 w-5" />
            </a>
            <div className="relative">
              <button
                onClick={handleEmailCopy}
                aria-label={t('copyEmail')}
                title={t('copyEmail')}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition cursor-pointer ${showCheckmark
                  ? 'border-blue-600 text-white bg-blue-600'
                  : 'border-slate-200 text-slate-700 hover:text-white hover:bg-blue-600 hover:border-blue-600'
                  }`}
              >
                {showCheckmark ? (
                  <FaCheck className="h-4 w-4" />
                ) : (
                  <MdEmail className="h-5 w-5" />
                )}
              </button>

              {/* 提示框 */}
              {showTooltip && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-slate-800 text-white text-xs rounded-md whitespace-nowrap shadow-lg">
                  {t('emailCopied')}
                  {/* 小箭头 */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800"></div>
                </div>
              )}
            </div>

          </div>

          <div className="lg:col-span-1 text-sm text-slate-500">
            <p>{t('copyright')}</p>
            <p className="mt-2">{t('icp')}</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
