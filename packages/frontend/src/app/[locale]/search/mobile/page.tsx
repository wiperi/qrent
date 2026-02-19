import FilterModal from '@/components/FilterModal';
import SearchBar from '@/components/SearchBar';
import SearchResults from '../SearchResults';
import CurrentFiltersBar from '@/components/FilterTags';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

type SearchParams = {
  q?: string
  page?: string
}

/**
 * 生成移动端搜索页面的 SEO 元数据
 * 
 * @param params 路由参数，包含当前语言环境
 * @param searchParams 搜索参数，包含查询词等
 * @returns 生成的 SEO 元数据
 */
export async function generateMetadata({ params, searchParams }: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale });
  const searchParamsObj = await searchParams;
  const query = searchParamsObj.q;
  
  // 生成更智能的搜索元数据
  const generateSearchMeta = () => {
    if (query) {
      // 基于搜索查询生成长尾关键词友好的标题
      const searchTerms = query.toLowerCase().split(' ');
      const isLocationSearch = searchTerms.some(term => 
        ['sydney', 'melbourne', 'brisbane', 'perth', 'adelaide', 'canberra', 'darwin', 'hobart', '悉尼', '墨尔本', '布里斯班', '珀斯', '阿德莱德'].includes(term)
      );
      const isPropertyTypeSearch = searchTerms.some(term =>
        ['apartment', 'house', 'unit', 'studio', 'room', 'flat', '公寓', '别墅', '单间', '房子'].includes(term)
      );
      
      let titleKey: string;
      let descriptionKey: string;
      
      if (isLocationSearch && isPropertyTypeSearch) {
        titleKey = 'search.titleLocationType';
        descriptionKey = 'search.descriptionLocationType';
      } else if (isLocationSearch) {
        titleKey = 'search.titleLocation';
        descriptionKey = 'search.descriptionLocation';
      } else {
        titleKey = 'search.titleWithQuery';
        descriptionKey = 'search.descriptionWithQuery';
      }
      
      return {
        title: t(titleKey, { query }),
        description: t(descriptionKey, { query })
      };
    }
    
    // 默认搜索页面元数据
    return {
      title: t('search.title'),
      description: t('search.description')
    };
  };
  
  const metaContent = generateSearchMeta();
  
  // 构建基础URL和查询参数
  const baseUrl = 'https://qrent.rent';
  const searchQuery = query ? `?q=${encodeURIComponent(query)}` : '';
  const currentUrl = `${baseUrl}/${locale}/search/mobile${searchQuery}`;
  
  return {
    title: metaContent.title,
    description: metaContent.description,
    openGraph: {
      title: metaContent.title,
      description: metaContent.description,
      type: 'website',
      siteName: 'QRent',
    },
    twitter: {
      title: metaContent.title,
      description: metaContent.description,
      card: 'summary_large_image',
    },
    alternates: {
      canonical: currentUrl,
      languages: {
        'en': `${baseUrl}/en/search/mobile${searchQuery}`,
        'zh': `${baseUrl}/zh/search/mobile${searchQuery}`,
        'x-default': `${baseUrl}/search/mobile${searchQuery}`,
      },
    },
  };
}

export default async function MobileSearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Mobile-specific search bar */}
      <section className="py-3 bg-white shadow-sm sticky top-0 z-10">
        <div className="mx-auto px-4">
          <SearchBar />
        </div>
      </section>

      {/* Mobile-specific filters bar */}
      <section className="py-2 bg-white border-b border-gray-200">
        <div className="mx-auto px-4">
          <CurrentFiltersBar />
        </div>
      </section>

      {/* Results area - mobile optimized */}
      <section className="py-2">
        <SearchResults searchParams={params} />
      </section>
      
      <FilterModal />
    </main>
  )
}