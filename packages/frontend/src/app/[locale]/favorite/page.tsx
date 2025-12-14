'use client';

import { useTRPCClient } from '@/lib/trpc';
import { useAuth } from '@/hooks/use-auth';
import { showLoginModal } from '@/lib/auth-events';
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
  
  // TRPC错误类型定义
  interface TRPCErrorShape {
    shape?: {
      message?: string;
      data: {
        code: string;
        httpStatus: number;
        stack?: string;
        path?: string;
      };
    };
  }

  // 错误状态处理
  if (error) {
    let errorMessage = t('errorState');
    let errorTitle = t('title');
    let errorType: 'info' | 'warning' | 'error' = 'error';
    
    // 检查具体的错误类型
    if (error && typeof error === 'object') {
      const errorData = error as TRPCErrorShape;
      
      // 获取TRPC错误信息
      const shape = errorData.shape;
      const data = shape?.data;
      
      // 处理401未登录错误
      if (data?.code === 'UNAUTHORIZED' || data?.httpStatus === 401) {
        errorMessage = t('unauthorizedError') || '请先登录以查看收藏列表';
        errorTitle = t('loginRequired') || '需要登录';
        errorType = 'info';
      }
      // 处理403权限错误
      else if (data?.code === 'FORBIDDEN' || data?.httpStatus === 403) {
        errorMessage = t('forbiddenError') || '您没有权限访问此页面';
        errorType = 'warning';
      }
      // 处理404找不到资源
      else if (data?.httpStatus === 404) {
        errorMessage = t('notFoundError') || '收藏列表不存在';
        errorType = 'info';
      }
      // 处理网络错误
      else if ( data?.httpStatus === 0) {
        errorMessage = t('networkError') || '网络连接失败，请检查网络连接';
        errorType = 'warning';
      }
      // 处理服务器错误
      else if (data?.httpStatus === 500) {
        errorMessage = t('serverError') || '服务器错误，请稍后重试';
        errorType = 'error';
      }
      // 显示具体的错误信息（调试用）
      else if (shape?.message) {
        errorMessage = `${t('errorState')} ${shape.message}`;
      }
    }
    
    // 根据错误类型设置样式
    const errorStyles = {
      info: 'bg-blue-50 border-blue-200 text-blue-600',
      warning: 'bg-yellow-50 border-yellow-200 text-yellow-600',
      error: 'bg-red-50 border-red-200 text-red-600'
    };
    
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">{errorTitle}</h1>
        <div className={`border rounded-lg p-6 ${errorStyles[errorType]}`}>
          <p className="font-medium mb-2">{errorMessage}</p>
          {error && typeof error === 'object' && (error as TRPCErrorShape).shape?.data?.httpStatus && (
            <p className="text-sm opacity-75">
              error code: {(error as TRPCErrorShape).shape?.data?.httpStatus}
            </p>
          )}
          {errorType === 'info' && error && typeof error === 'object' && (error as TRPCErrorShape).shape?.data?.code === 'UNAUTHORIZED' && (
            <div className="mt-4">
              <button 
                onClick={() => {
                  console.log('Login button clicked, opening global auth modal');
                  showLoginModal();
                }}
                className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors cursor-pointer"
                type="button"
              >
                {t('goToLogin') || '前往登录'}
              </button>
            </div>
          )}
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