'use client';

import { useTRPCClient } from '@/lib/trpc';
import { SCHOOL } from '@qrent/shared/enum';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import PropertyCard from './PropertyCard';
import Section from './Section';

export default function PropertyGrid() {
  const t = useTranslations('PropertyGrid');
  const [selectedUniversity, setSelectedUniversity] = useState(SCHOOL.UNSW);
  const trpc = useTRPCClient();
  const queryClient = useQueryClient();
  const { user, isLoading } = useAuth();

  // 获取房产列表
  const { data, isPending, error } = useQuery({
    queryKey: ['properties.search', selectedUniversity, user?.id],
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
    enabled: !isLoading, // 只在认证状态确定后才启用查询
    
  });

  // @Deprecated: 后端应该直接返回房源状态
  // // 获取用户收藏列表
  // const { data: subscriptions, isLoading: subscriptionsLoading } = useQuery({
  //   queryKey: ['properties.getSubscriptions'],
  //   queryFn: () => trpc.properties.getSubscriptions.query(),
  //   enabled: typeof window !== 'undefined' && !!localStorage.getItem('auth-token'),
  //   // initialData: getCachedSubscriptions(), // 注释掉：localStorage缓存会造成多端不一致
  // });

  // // 创建收藏 ID 的 Set 用于快速查找
  // const subscribedPropertyIds = new Set(subscriptions?.map((sub: Subscription) => sub.id) || []);

  // 当 subscriptions 更新时，保存到 localStorage
  // 注释掉：localStorage缓存会造成多端不一致
  // useEffect(() => {
  //   if (typeof window !== 'undefined' && subscriptions && subscriptions.length >= 0) {
  //     localStorage.setItem(SUBSCRIPTIONS_CACHE_KEY, JSON.stringify(subscriptions));
  //   }
  // }, [subscriptions]);

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
      <span>{t('dailyNewHouses')}</span>
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

  // 🔥 在前端按评分降序排序(从高到低)
  const sortedProperties = [...properties].sort((a, b) => {
    return (b.averageScore || 0) - (a.averageScore || 0);
  });

  return (
    <Section title={sectionTitle}>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sortedProperties.map(property => (
          <PropertyCard
            id={property.id}
            key={property.id}
            address={property.address}
            region={property.region || ''}
            price={property.price}
            bedroomCount={property.bedroomCount}
            bathroomCount={property.bathroomCount}
            propertyType={property.propertyType}
            commuteTime={property.commuteTime ?? undefined}
            url={property.url}
            thumbnailUrl={property.thumbnailUrl}
            subscribed={property.subscribed}
            averageScore={property.averageScore}
            keywords={property.keywords}
            availableDate={property.availableDate}
            publishedAt={property.publishedAt}
            propertyId={property.id as number}
          />
        ))}
      </div>
    </Section>
  );
}