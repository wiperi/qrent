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