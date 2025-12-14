'use client';

import { useTRPCClient } from '@/lib/trpc';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import PropertyCard from '@/components/PropertyCard';
import Section from '@/components/Section';

/**
 * 收藏夹页面
 * 显示用户收藏的房产列表
 */
export default function FavoritePage() {
  const t = useTranslations('FavoritePage');
  const trpc = useTRPCClient();
  const queryClient = useQueryClient();
  const { user, isLoading } = useAuth();
  
  // 获取用户收藏的房产列表
  const { data, isPending, error } = useQuery({
    queryKey: ['properties.subscriptions', user?.id],
    queryFn: () => trpc.properties.getSubscriptions.query(),
    enabled: !isLoading,
  });

  // 监听用户认证状态变化，重新获取收藏数据
  useEffect(() => {
    if (!isLoading && user?.id) {
      queryClient.invalidateQueries({ queryKey: ['properties.subscriptions', user.id] });
    }
  }, [user?.id, isLoading, queryClient]);
  
  // 加载状态
  if (isPending) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">{t('title')}</h1>
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
      </div>
    );
  }
  
  // 错误状态
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">{t('title')}</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-600">{t('errorState')}</p>
        </div>
      </div>
    );
  }
  
  // 提取房产数据
  const properties = data || [];
  
  return (
    <div className="container mx-auto px-4 py-8">
      {properties.length > 0 ? (
        <Section title={t('title')}>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {properties.map(property => (
              <PropertyCard
                key={property.id as string | number}
                address={property.address}
                region={property.region || ''}
                price={property.price}
                bedroomCount={property.bedroomCount}
                bathroomCount={property.bathroomCount}
                propertyType={property.propertyType}
                commuteTime={property.commuteTime ?? undefined}
                url={property.url}
                thumbnailUrl={property.thumbnailUrl}
                averageScore={property.averageScore}
                keywords={property.keywords}
                availableDate={property.availableDate}
                publishedAt={property.publishedAt}
                subscribed={property.subscribed}
                propertyId={property.id as number}
                id={property.id as number}
              />
            ))}
          </div>
        </Section>
      ) : (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-gray-600">{t('emptyState')}</p>
        </div>
      )}
    </div>
  );
}