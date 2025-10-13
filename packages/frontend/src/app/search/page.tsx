import { Metadata } from 'next'
import SearchBar from '@/components/SearchBar'
import FilterModal from '@/components/FilterModal'
import SearchResults from './SearchResults'

export const metadata: Metadata = {
  title: 'Search — Your dream home awaits',
}

type SearchParams = {
  q?: string
  page?: string
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams

  return (
    <main>
      {/* Head bar already provided by Header. Below it, the search bar aligned to container width */}
      <section className="py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SearchBar />
        </div>
      </section>

      {/* Results area */}
      <SearchResults searchParams={params} />
      <FilterModal />
    </main>
  )
}



