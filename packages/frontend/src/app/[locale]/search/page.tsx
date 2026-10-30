import FilterModal from '@/components/FilterModal';
import SearchBar from '@/components/SearchBar';
import SearchResults from './SearchResults';
// 横向: 添加
import CurrentFiltersBar from '@/components/FilterTags';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import RentalLinks from '@/components/RentalLinks';

type SearchParams = {
  q?: string;
  page?: string;
};

/**
 * 生成搜索页面的 SEO 元数据
 *
 * @param params 路由参数，包含当前语言环境
 * @param searchParams 搜索参数，包含查询词等
 * @returns 生成的 SEO 元数据
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(
    locale,
    '/search',
    locale === 'zh' ? '悉尼房源筛选 | QRent' : 'Sydney Rental Search | QRent',
    locale === 'zh'
      ? '按大学、周租、卧室、区域和公共交通时间筛选 Domain 与 Real Estate 房源。'
      : 'Filter Domain and Real Estate rentals by university, weekly price, bedrooms, area and public transport commute.',
    { index: false }
  );
}

export default async function SearchPage({
  searchParams,
  params: routeParams,
}: {
  searchParams: Promise<SearchParams>;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await routeParams;
  const params = await searchParams;

  return (
    <main>
      <h1 className="sr-only">{locale === 'zh' ? '悉尼租房搜索' : 'Sydney rental search'}</h1>
      {/* Head bar already provided by Header. Below it, the search bar aligned to container width */}
      <section className="py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SearchBar />

          {/*横向*/}
          <CurrentFiltersBar />
        </div>
      </section>

      {/* Results area */}
      <SearchResults searchParams={params} />
      <FilterModal />
      <RentalLinks locale={locale} compact />
    </main>
  );
}
