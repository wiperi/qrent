'use client';

import { useTRPCClient } from '@/lib/trpc';
import { SCHOOL } from '@qrent/shared/enum';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import PropertyCard from './PropertyCard';
import Section from './Section';

const SUBSCRIPTIONS_CACHE_KEY = 'user-subscriptions-cache';

interface Subscription {
  id: number;
}

export default function PropertyGrid() {
  const t = useTranslations('PropertyGrid');
  const [selectedUniversity, setSelectedUniversity] = useState(SCHOOL.UNSW);
  const trpc = useTRPCClient();
  
  // 从 localStorage 读取缓存的收藏列表
  const getCachedSubscriptions = () => {
    if (typeof window === 'undefined') return [];
    try {
      const cached = localStorage.getItem(SUBSCRIPTIONS_CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  };
  
  // 获取房产列表
  const { data, isPending, error } = useQuery({
    queryKey: ['properties.search', selectedUniversity],
    queryFn: () =>
      trpc.properties.search.query({
        targetSchool: selectedUniversity,
        pageSize: 8,
        page: 1,
        orderBy: [
          {
            publishedAt: 'desc' as const,
          },
          {
            averageScore: 'desc' as const,
          },
        ],
      }),
  });

  // 获取用户收藏列表
  const { data: subscriptions, isLoading: subscriptionsLoading } = useQuery({
    queryKey: ['properties.getSubscriptions'],
    queryFn: () => trpc.properties.getSubscriptions.query(),
    enabled: typeof window !== 'undefined' && !!localStorage.getItem('auth-token'),
    initialData: getCachedSubscriptions(), // 使用缓存作为初始数据
  });

  // 创建收藏 ID 的 Set 用于快速查找
  const subscribedPropertyIds = new Set(
    subscriptions?.map((sub: Subscription) => sub.id) || []
  );

  // 当 subscriptions 更新时，保存到 localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && subscriptions && subscriptions.length >= 0) {
      localStorage.setItem(SUBSCRIPTIONS_CACHE_KEY, JSON.stringify(subscriptions));
    }
  }, [subscriptions]);

  const getUniversityColors = (school: string, isSelected: boolean) => {
    const colors = {
      [SCHOOL.UNSW]: {
        selected: 'bg-yellow-400 text-black',
        hover: 'hover:bg-yellow-100 hover:text-yellow-800',
      },
      [SCHOOL.USYD]: {
        selected: 'bg-blue-800 text-yellow-400',
        hover: 'hover:bg-blue-100 hover:text-blue-800',
      },
      [SCHOOL.UTS]: {
        selected: 'bg-blue-500 text-orange-400',
        hover: 'hover:bg-blue-100 hover:text-blue-600',
      },
    };

    return isSelected
      ? colors[school as keyof typeof colors]?.selected || 'bg-blue-600 text-white'
      : colors[school as keyof typeof colors]?.hover || 'hover:text-blue-600';
  };

  const sectionTitle = (
    <div className="flex flex-wrap justify-center items-center gap-3">
      <span className="flex-shrink-0">{t('dailyNewHouses')}</span>
      <div className="flex flex-wrap rounded-lg border border-slate-200 bg-slate-50">
        {Object.values(SCHOOL).map(school => (
          <button
            key={school}
            onClick={() => setSelectedUniversity(school)}
            className={`px-3 py-2 transition-colors rounded-md ${
              selectedUniversity === school
                ? `${getUniversityColors(school, true)} shadow-sm`
                : getUniversityColors(school, false)
            }`}
          >
            {school}
          </button>
        ))}
      </div>
    </div>
  );

  if (isPending) {
    return (
      <Section title={sectionTitle}>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white"
            >
              <div className="p-4 space-y-3">
                <div className="h-4 bg-slate-200 rounded w-2/3" />
                <div className="h-3 bg-slate-200 rounded w-1/2" />
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-3 bg-slate-200 rounded w-full" />
                <div className="h-3 bg-slate-200 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </Section>
    );
  }

  if (error) {
    return (
      <Section title={sectionTitle}>
        <div className="text-center py-8">
          <p className="text-slate-600">{t('loadError')}</p>
        </div>
      </Section>
    );
  }

  const properties = data?.properties || [];

  return (
    <Section title={sectionTitle}>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {properties.map(property => (
          <PropertyCard
            key={property.id as string | number}
            id={property.id}
            isSubscribed={subscribedPropertyIds.has(property.id)}
            subscriptionsLoading={subscriptionsLoading}
            thumbnailUrl={property.thumbnailUrl}
            address={property.address}
            region={property.region || ''}
            price={property.price}
            bedroomCount={property.bedroomCount}
            bathroomCount={property.bathroomCount}
            propertyType={property.propertyType}
            commuteTime={property.commuteTime ?? undefined}
            url={property.url}
            averageScore={property.averageScore}
            keywords={property.keywords}
            availableDate={property.availableDate}
            publishedAt={property.publishedAt}
          />
        ))}
      </div>
    </Section>
  );
}