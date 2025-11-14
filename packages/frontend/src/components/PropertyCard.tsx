import { LOCALE } from '@qrent/shared/enum';
import { useLocale, useTranslations } from 'next-intl';
import { FaBath, FaHeart } from 'react-icons/fa';
import { IoBed, IoHeartOutline } from 'react-icons/io5';
import { useTRPCClient } from '@/lib/trpc';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

interface PropertyCardProps {
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
  const t = useTranslations('PropertyCard');
  const locale = useLocale();
  const propertyTypeName = propertyType === 1 ? t('house') : t('apartment');
  const defaultThumbnail =
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop';

  const trpc = useTRPCClient();
  const queryClient = useQueryClient();
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [localSubscribed, setLocalSubscribed] = useState(subscribed || false);

  const subscribeMutation = useMutation({
    mutationFn: async (propertyId: number) => {
      return await trpc.properties.subscribe.mutate({ propertyId });
    },
    onSuccess: () => {
      setLocalSubscribed(true);
      queryClient.invalidateQueries({ queryKey: ['properties'] });
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
      queryClient.invalidateQueries({ queryKey: ['properties'] });
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

    // If date is in the past or today
    if (diffDays <= 0) {
      return t('availableNow');
    }

    // If within the next week
    if (diffDays <= 7) {
      return t('availableInDays', { days: diffDays, plural: diffDays === 1 ? '' : 's' });
    }

    // For dates further out, show the actual date
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: availableDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    };

    const formattedDate = availableDate.toLocaleDateString(
      locale === LOCALE.ZH ? 'zh-CN' : 'en-US',
      options
    );
    return `${t('available')} ${formattedDate}`;
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
      {/* Image section with overlays */}
      <div className="relative w-full h-48 overflow-hidden rounded-t-2xl">
        <Image
          src={thumbnailUrl}
          alt={formatAddress(address)}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />

        {/* Top right: Score badge and favorite button */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <div
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-semibold ${getScoreColor(averageScore)}`}
          >
            <span>{averageScore.toFixed(1)}</span>
            <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>

          {/* <button className="bg-white rounded-full p-1.5 shadow-md hover:scale-110 transition-transform">
            <svg
              className="w-4 h-4 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </button> */}
        </div>

        {/* Bottom left: House type and Available date badges */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <span className="bg-blue-200 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
            {propertyTypeName}
          </span>
          {availableDate && formatAvailableDate(availableDate) && (
            <span className="bg-green-200 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
              {formatAvailableDate(availableDate)}
            </span>
          )}
        </div>
      </div>

      {/* Info section */}
      <div className="p-4">
        {/* First row: Address */}
        <h3 className="text-base font-semibold text-slate-900">{formatAddress(address)}</h3>

        {/* Second row: Region */}
        <p className="mt-1 text-sm text-slate-600">{formatRegion(region)}</p>

        {/* Third row: Price */}
        <p className="mt-3 text-2xl font-bold text-blue-600">
          ${price.toLocaleString()}
          <span className="text-sm text-slate-500 font-normal ml-1">{t('perWeek')}</span>
        </p>

        {/* Fourth row: Bedroom and bathroom count */}
        <div className="mt-2 flex items-center gap-3 text-slate-600">
          {bedroomCount !== undefined && (
            <span className="flex items-center gap-1.5 text-sm">
              <IoBed className="w-5 h-5" />
              {bedroomCount}
            </span>
          )}
          {bathroomCount !== undefined && (
            <span className="flex items-center gap-1.5 text-sm">
              <FaBath className="w-4 h-4" />
              {bathroomCount}
            </span>
          )}
        </div>

        {/* Commute time */}
        {commuteTime !== undefined && (
          <p className="mt-2 text-sm text-slate-600">
            {commuteTime} {t('minToUniversity')}
          </p>
        )}

        {/* Published date */}
        {publishedAt && (
          <div className="mt-1 text-xs text-slate-500">
            {t('published')} {formatPublishedAt(publishedAt)}
          </div>
        )}

        {/* Source domain */}
        {/* {url && (
          <div className="mt-1 text-xs text-slate-500">
            {t('source')}: {new URL(url).hostname.replace('www.', '')}
          </div>
        )} */}

        {/* Keywords */}
        {keywordList.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {keywordList.map((keyword, index) => (
              <span
                key={index}
                className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200"
              >
                {keyword}
              </span>
            ))}
          </div>
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
        className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md transition hover:-translate-y-1 hover:shadow-xl"
      >
        <article className="relative">{content}</article>
      </a>
    );
  }

  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md transition hover:-translate-y-1 hover:shadow-xl">
      <div className="relative">{content}</div>
    </article>
  );
}
