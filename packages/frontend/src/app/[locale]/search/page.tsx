import FilterModal from '@/components/FilterModal';
import SearchBar from '@/components/SearchBar';
import SearchResults from './SearchResults';
// 横向: 添加
import CurrentFiltersBar from '@/components/FilterTags';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

type SearchParams = {
  q?: string
  page?: string
}

export async function generateMetadata({ params, searchParams }: {
  params: { locale: string };
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale });
  const searchParamsObj = await searchParams;
  const query = searchParamsObj.q;
  
  if (query) {
    return {
      title: t('search.titleWithQuery', { 
        query, 
        default: `Search results for "${query}" - QRent` 
      }),
      description: t('search.descriptionWithQuery', {
        query,
        default: `Find rental properties matching "${query}" on QRent. Your perfect home awaits.`
      }),
      openGraph: {
        title: t('search.titleWithQuery', { 
          query, 
          default: `Search results for "${query}" - QRent` 
        }),
        description: t('search.descriptionWithQuery', {
          query,
          default: `Find rental properties matching "${query}" on QRent. Your perfect home awaits.`
        }),
      },
      twitter: {
        title: t('search.titleWithQuery', { 
          query, 
          default: `Search results for "${query}" - QRent` 
        }),
        description: t('search.descriptionWithQuery', {
          query,
          default: `Find rental properties matching "${query}" on QRent. Your perfect home awaits.`
        }),
      },
    };
  }
  
  return {
    title: t('search.title', { default: 'Property Search - QRent' }),
    description: t('search.description', {
      default: 'Search for rental properties by location, price, and amenities. Find your perfect home today.'
    }),
    openGraph: {
      title: t('search.title', { default: 'Property Search - QRent' }),
      description: t('search.description', {
        default: 'Search for rental properties by location, price, and amenities. Find your perfect home today.'
      }),
    },
    twitter: {
      title: t('search.title', { default: 'Property Search - QRent' }),
      description: t('search.description', {
        default: 'Search for rental properties by location, price, and amenities. Find your perfect home today.'
      }),
    },
  };
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;

  return (
    <main>
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
    </main>
  )
}
