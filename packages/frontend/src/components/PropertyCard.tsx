import { LOCALE } from '@qrent/shared/enum';
import { useLocale, useTranslations } from 'next-intl';
import { FaBath, FaStar, FaRegStar } from 'react-icons/fa';
import { IoBed } from 'react-icons/io5';
import { useState, useRef, useEffect } from 'react';
import { useTRPCClient } from '@/lib/trpc';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';

interface PropertyCardProps {
  id: number;
  address: string;
  region: string;
  price: number;
  bedroomCount?: number;
  bathroomCount?: number;
  propertyType: number;
  commuteTime?: number;
  url: string;
  averageScore: number;
  keywords: string;
  availableDate?: string | null;
  publishedAt: string;
  thumbnailUrl: string;
  subscribed?: boolean;
  propertyId?: number;
}

export default function PropertyCard({
  address,
  region,
  price,
  bedroomCount,
  bathroomCount,
  propertyType,
  commuteTime,
  url,
  averageScore,
  keywords,
  availableDate,
  publishedAt,
  thumbnailUrl,
  subscribed,
  propertyId,
}: PropertyCardProps) {
  const [addressFontSize, setAddressFontSize] = useState(18);
  const addressRef = useRef<HTMLHeadingElement>(null);
  const keywordContainerRef = useRef<HTMLDivElement>(null);
  const t = useTranslations('PropertyCard');
  const locale = useLocale();
  const propertyTypeName = propertyType === 1 ? t('house') : t('apartment');
  const trpc = useTRPCClient();
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [localSubscribed, setLocalSubscribed] = useState(subscribed || false);

  const subscribeMutation = useMutation({
    mutationFn: async (propertyId: number) => {
      return await trpc.properties.subscribe.mutate({ propertyId });
    },
    onSuccess: () => {
      setLocalSubscribed(true);
      // 失效所有相关的房产查询
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['properties.search'] });
      queryClient.invalidateQueries({ queryKey: ['properties.subscriptions'] });
    },
    onError: (error: { data?: { code: string } }) => {
      // 如果是409错误（已订阅），静默处理并将状态改为已订阅
      if (error?.data?.code === 'CONFLICT') {
        // 静默处理，不显示错误，但更新本地状态
        setLocalSubscribed(true);
      } else {
        console.error('Failed to subscribe:', error);
      }
    },
    onSettled: () => {
      setIsSubscribing(false);
    },
  });

  const unsubscribeMutation = useMutation({
    mutationFn: async (propertyId: number) => {
      return await trpc.properties.unsubscribe.mutate({ propertyId });
    },
    onSuccess: () => {
      setLocalSubscribed(false);
      // 失效所有相关的房产查询
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['properties.search'] });
      queryClient.invalidateQueries({ queryKey: ['properties.subscriptions'] });
    },
    onError: (error: { data?: { code: string } }) => {
      // 如果是404错误（未订阅），静默处理并将状态改为未订阅
      if (error?.data?.code === 'NOT_FOUND') {
        // 静默处理，不显示错误，但更新本地状态
        setLocalSubscribed(false);
      } else {
        console.error('Failed to unsubscribe:', error);
      }
    },
    onSettled: () => {
      setIsSubscribing(false);
    },
  });

  const handleSubscribeToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!propertyId || isSubscribing) return;

    setIsSubscribing(true);

    if (localSubscribed) {
      unsubscribeMutation.mutate(propertyId);
    } else {
      subscribeMutation.mutate(propertyId);
    }
  };
  const queryClient = useQueryClient();

  // 判断是否是 flatmates 房源
  const isFlatmates = url.toLowerCase().includes('flatmates');

  // 同步外部传入的 subscribed 状态 - 修复前进/后退时的状态问题
  useEffect(() => {
    setLocalSubscribed(subscribed || false);
  }, [subscribed]);

  // 自动调整地址字体大小
  useEffect(() => {
    const adjustFontSize = () => {
      const element = addressRef.current;
      if (!element) return;

      const parentWidth = element.parentElement?.offsetWidth || 0;
      let fontSize = 18;

      element.style.fontSize = `${fontSize}px`;

      while (element.scrollWidth > parentWidth && fontSize > 12) {
        fontSize -= 0.5;
        element.style.fontSize = `${fontSize}px`;
      }

      setAddressFontSize(fontSize);
    };

    adjustFontSize();
    window.addEventListener('resize', adjustFontSize);

    return () => window.removeEventListener('resize', adjustFontSize);
  }, [address]);

  const capitalizeEnglishWords = (text: string) => {
    return text.replace(/\b[a-zA-Z]+\b/g, word => {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
  };

  const formatAddress = (address: string) => {
    const firstDashIndex = address.indexOf('-');
    if (firstDashIndex === -1) return capitalizeEnglishWords(address);

    const unitNumber = address.substring(0, firstDashIndex);
    const remainder = address.substring(firstDashIndex + 1).replace(/-/g, ' ');

    return `${unitNumber} / ${capitalizeEnglishWords(remainder)}`;
  };

  const formatRegion = (region: string) => {
    const formatted = region.replace(/-/g, ' ');
    return capitalizeEnglishWords(formatted);
  };

  const keywordList = keywords.trim()
    ? keywords
        .split(',')
        .map(k => k.trim())
        .filter(Boolean)
        .slice(0, 10)
    : [];

  // 动态计算能显示的关键词数量（确保完整显示，不截断）
  useEffect(() => {
    if (keywordList.length === 0) return;

    const calculateVisibleKeywords = () => {
      const container = keywordContainerRef.current;
      if (!container) return;
    };

    // 使用 setTimeout 确保 DOM 已完全渲染
    const timer = setTimeout(calculateVisibleKeywords, 0);

    // 监听窗口大小变化
    window.addEventListener('resize', calculateVisibleKeywords);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', calculateVisibleKeywords);
    };
  }, [keywordList]);

  // 从 URL 提取网站名称
  const getWebsiteName = (url: string): string => {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();

      // 移除 www. 前缀
      const domain = hostname.replace(/^www\./, '');

      // 提取主域名（去掉 .com.au 等后缀）
      const mainDomain = domain.split('.')[0];

      // 首字母大写
      return mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1);
    } catch {
      return 'Unknown';
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 18.3) return 'bg-orange-600 text-white';
    if (score >= 18) return 'bg-orange-500 text-white';
    return 'bg-orange-400 text-white';
  };

  const formatAvailableDate = (date: string | null | undefined): string | null => {
    if (date === null || date === undefined) {
      return null;
    }

    const now = new Date();
    const availableDate = new Date(date);
    const diffTime = availableDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return t('availableNow');
    }

    if (diffDays <= 7) {
      return t('availableInDays', { days: diffDays, plural: diffDays === 1 ? '' : 's' });
    }

    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: availableDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    };

    const formattedDate = availableDate.toLocaleDateString(
      locale === LOCALE.ZH ? 'zh-CN' : 'en-US',
      options
    );

    if (locale === LOCALE.ZH) {
      return `${formattedDate}${t('available')}`;
    } else {
      return `${t('available')} ${formattedDate}`;
    }
  };

  const formatPublishedAt = (date: string | Date | null | undefined): string | null => {
    if (date === null || date === undefined) {
      return null;
    }

    const publishedDate = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();

    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: publishedDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    };

    return publishedDate.toLocaleDateString(locale === LOCALE.ZH ? 'zh-CN' : 'en-US', options);
  };

  const content = (
    <>
      {/* Property Image with overlay info */}
      {thumbnailUrl && (
        <div className="relative w-full h-64 overflow-hidden">
          <Image
            src={thumbnailUrl}
            alt={formatAddress(address)}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />

          {/* Dark gradient overlay at bottom */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Top right: Score badge and Subscribe button */}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
            {/* Score badge */}
            <div
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold ${getScoreColor(averageScore)}`}
            >
              <span>{averageScore.toFixed(1)}</span>
            </div>
            <button
              onClick={handleSubscribeToggle}
              disabled={isSubscribing || !propertyId}
              className={`flex items-center justify-center rounded-full p-1.5 shadow-md hover:scale-130 transition-all duration-300 ease-in-out
                   bg-white text-orange-400 hover:bg-orange-50 hover:shadow-lg hover:rotate-5
                  ${isSubscribing ? 'animate-pulse opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              title={localSubscribed ? t('unsubscribe') : t('subscribe')}
            >
              {localSubscribed ? (
                <FaStar
                  className={`w-5 h-5 transition-all duration-1200 ease-in-out transform
                    ${isSubscribing ? 'animate-pulse' : ''}`}
                />
              ) : (
                <FaRegStar
                  className={`w-5 h-5 transition-all duration-1200 ease-in-out transform
                    ${isSubscribing ? 'animate-pulse' : ''}`}
                />
              )}
            </button>
          </div>

          {/* Bottom left: Property info overlay on image */}
          <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
            {/* Address - 修复溢出问题 */}
            <h3
              ref={addressRef}
              className="font-semibold text-white drop-shadow-lg line-clamp-2 break-words"
              style={{ fontSize: `${addressFontSize}px` }}
            >
              {formatAddress(address)}
            </h3>

            {/* Region and badges - 分成两行，徽章始终在一起 */}
            <div className="flex flex-col gap-1 mt-0.5">
              {/* 第一行：地区名 */}
              <p className="text-sm text-white/90 drop-shadow-lg">{formatRegion(region)}</p>

              {/* 第二行：两个徽章（如果有的话） */}
              {(propertyTypeName || (availableDate && formatAvailableDate(availableDate))) && (
                <div className="flex items-center gap-2">
                  <span className="bg-blue-600 text-white px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap">
                    {propertyTypeName}
                  </span>
                  {availableDate && formatAvailableDate(availableDate) && (
                    <span className="bg-green-600 text-white px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap">
                      {formatAvailableDate(availableDate)}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content area with padding */}
      <div className="p-4 h-[300px] flex flex-col">
        <p className="text-brand font-semibold text-lg">
          ${price.toLocaleString()}
          <span className="text-sm text-slate-500 font-normal">{t('perWeek')}</span>
        </p>

        <div className="mt-2 space-y-2">
          {/* Bedroom and bathroom info */}
          <div className="flex items-center gap-2 text-sm text-slate-600">
            {bedroomCount && (
              <span className="flex items-center gap-1">
                <IoBed className="w-4 h-4" />
                {bedroomCount}
              </span>
            )}
            {bathroomCount && (
              <span className="flex items-center gap-1">
                <FaBath className="w-4 h-4" />
                {bathroomCount}
              </span>
            )}
          </div>

          {/* Published date */}
          {publishedAt && (
            <div className="text-xs text-slate-500">
              {t('published')} {formatPublishedAt(publishedAt)}
            </div>
          )}
        </div>

        {commuteTime !== undefined && (
          <p className="mt-1 text-xs text-black font-bold">
            {commuteTime} {t('minToUniversity')}
          </p>
        )}

        {/* Divider line */}
        {(keywordList.length > 0 || isFlatmates) && (
          <hr className="my-3 border-t border-gray-200" />
        )}

        {/* Flatmates 房源显示警告提示，其他房源显示关键词 */}
        {isFlatmates ? (
          <div className="mt-2 text-xs text-gray-500 leading-relaxed">{t('flatmatesWarning')}</div>
        ) : (
          keywordList.length > 0 && (
            <div
              ref={keywordContainerRef}
              className="flex flex-wrap gap-1.5 content-start overflow-hidden"
            >
              {keywordList.slice(0, keywordList.length).map((keyword, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full whitespace-nowrap flex-shrink-0"
                >
                  {keyword}
                </span>
              ))}
            </div>
          )
        )}
      </div>
    </>
  );

  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-card"
      >
        <article className="relative">{content}</article>
      </a>
    );
  }

  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-card">
      <div className="relative">{content}</div>
    </article>
  );
}
