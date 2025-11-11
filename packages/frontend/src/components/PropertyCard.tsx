import { LOCALE } from '@qrent/shared/enum';
import { useLocale, useTranslations } from 'next-intl';
import { FaBath } from 'react-icons/fa';
import { IoBed } from 'react-icons/io5';
import { AiOutlineStar, AiFillStar } from 'react-icons/ai';
import { useState, useRef, useEffect } from 'react';
import { useTRPCClient } from '@/lib/trpc';
import { useMutation, useQueryClient } from '@tanstack/react-query';

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
  thumbnailUrl?: string;
  isSubscribed?: boolean;
  subscriptionsLoading?: boolean;
}

export default function PropertyCard({
  id,
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
  isSubscribed = false,
  subscriptionsLoading = false,
}: PropertyCardProps) {
  const [isFavorited, setIsFavorited] = useState(isSubscribed);
  const [addressFontSize, setAddressFontSize] = useState(18);
  const addressRef = useRef<HTMLHeadingElement>(null);
  const t = useTranslations('PropertyCard');
  const locale = useLocale();
  const propertyTypeName = propertyType === 1 ? t('house') : t('apartment');
  const queryClient = useQueryClient();

  // 判断是否是 flatmates 房源
  const isFlatmates = url.toLowerCase().includes('flatmates');

  // 获取 tRPC client
  const trpcClient = useTRPCClient();

  // 订阅/收藏 mutation
  const subscribeMutation = useMutation({
    mutationFn: async () => {
      return await trpcClient.properties.subscribe.mutate({ propertyId: id });
    },
    onSuccess: () => {
      // 刷新收藏列表
      queryClient.invalidateQueries({ queryKey: ['properties.getSubscriptions'] });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || '';
      
      // 如果是"已经收藏过"的错误，不回滚 UI
      if (errorMessage.toLowerCase().includes('already subscribed')) {
        queryClient.invalidateQueries({ queryKey: ['properties.getSubscriptions'] });
        return;
      }
      
      // 其他错误：回滚 UI 并提示
      setIsFavorited(false);
      alert('添加收藏失败，请重试');
    },
  });

  // 取消订阅 mutation
  const unsubscribeMutation = useMutation({
    mutationFn: async () => {
      return await trpcClient.properties.unsubscribe.mutate({ propertyId: id });
    },
    onSuccess: () => {
      // 刷新收藏列表
      queryClient.invalidateQueries({ queryKey: ['properties.getSubscriptions'] });
    },
    onError: (error: any) => {
      // 回滚 UI 并提示
      setIsFavorited(true);
      alert('取消收藏失败，请重试');
      queryClient.invalidateQueries({ queryKey: ['properties.getSubscriptions'] });
    },
  });

  // 同步外部传入的 isSubscribed 状态
  useEffect(() => {
    setIsFavorited(isSubscribed);
  }, [isSubscribed]);

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

  const keywordList = keywords.trim() ? keywords.split(',').map(k => k.trim()).filter(Boolean).slice(0, 10) : [];

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

  const websiteName = getWebsiteName(url);

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

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 检查用户是否登录
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null;
    if (!token) {
      alert('请登录后再收藏');
      return;
    }

    // 乐观更新 UI
    const newFavoriteState = !isFavorited;
    setIsFavorited(newFavoriteState);

    try {
      if (newFavoriteState) {
        await subscribeMutation.mutateAsync();
      } else {
        await unsubscribeMutation.mutateAsync();
      }
    } catch (error) {
      // 错误已经在 mutation 的 onError 中处理了
    }
  };

  // 按钮禁用条件：正在加载收藏列表，或正在执行收藏/取消收藏操作
  const isButtonDisabled = subscriptionsLoading || subscribeMutation.isPending || unsubscribeMutation.isPending;

  const content = (
    <>
      {/* Property Image with overlay info */}
      {thumbnailUrl && (
        <div className="relative w-full h-64 overflow-hidden">
          <img
            src={thumbnailUrl}
            alt={formatAddress(address)}
            className="w-full h-full object-cover"
          />
          
          {/* Dark gradient overlay at bottom */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Top right: Score badge and Favorite button */}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
            {/* Score badge */}
            <div
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold ${getScoreColor(averageScore)}`}
            >
              <span>{averageScore.toFixed(1)}</span>
            </div>
            
            {/* Favorite button - 在收藏数据加载时禁用 */}
            <button
              onClick={handleFavoriteClick}
              disabled={isButtonDisabled}
              className={`w-9 h-9 bg-white rounded-full transition-colors flex items-center justify-center shadow-md ${
                isButtonDisabled
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-gray-100'
              }`}
              aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
            >
              {isFavorited ? (
                <AiFillStar className="w-5 h-5 text-orange-500" />
              ) : (
                <AiOutlineStar className="w-5 h-5 text-orange-500" />
              )}
            </button>
          </div>

          {/* Bottom left: Property info overlay on image */}
          <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
            {/* Address */}
            <h3 
              ref={addressRef}
              className="font-semibold text-white drop-shadow-lg whitespace-nowrap"
              style={{ fontSize: `${addressFontSize}px` }}
            >
              {formatAddress(address)}
            </h3>
            
            {/* Region and badges in same line */}
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-sm text-white/90 drop-shadow-lg">
                {formatRegion(region)}
              </p>
              
              <span className="bg-blue-600 text-white px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap">
                {propertyTypeName}
              </span>
              {availableDate && formatAvailableDate(availableDate) && (
                <span className="bg-green-600 text-white px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap">
                  {formatAvailableDate(availableDate)}
                </span>
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

        {/* 来源网站 */}
        <p className="mt-2 text-xs text-gray-600">
          <span className="font-medium">来源网站：</span>
          <span>{websiteName}</span>
        </p>

        {/* Divider line */}
        {(keywordList.length > 0 || isFlatmates) && (
          <hr className="my-3 border-t border-gray-200" />
        )}

        {/* Flatmates 房源显示警告提示，其他房源显示关键词 */}
        {isFlatmates ? (
          <div className="mt-2 text-xs text-gray-500 leading-relaxed">
            温馨提示：该网站信息鱼龙混杂，潜在风险需自行判断，请谨慎选择。
          </div>
        ) : (
          keywordList.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1 overflow-hidden max-h-[120px]">
              {keywordList.map((keyword, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full whitespace-nowrap"
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