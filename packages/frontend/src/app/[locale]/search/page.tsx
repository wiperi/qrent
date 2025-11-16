import FilterModal from '@/components/FilterModal';
import SearchBar from '@/components/SearchBar';
import SearchResults from './SearchResults';
// 横向: 添加
import CurrentFiltersBar from '@/components/FilterTags';

type SearchParams = {
  q?: string
  page?: string
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
    //横向: 添加
    const hasFilter = [
    'propertyType',
    'priceMin', 'priceMax',
    'bedroomsMin', 'bedroomsMax',
    'bathroomsMin', 'bathroomsMax',
    'commuteMin', 'commuteMax',
    'rating',
    'moveInDate',
    'areas'
  ].some(key => params[key as keyof typeof params]);

  return (
    <main>
      {/* Head bar already provided by Header. Below it, the search bar aligned to container width */}
      <section className="py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SearchBar />
          
          {/*横向*/}
          {hasFilter && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow">
              <CurrentFiltersBar />
            </div>
          )}
        </div>
      </section>

      {/* Results area */}
      <SearchResults searchParams={params} />
      <FilterModal />
    </main>
  )
}
