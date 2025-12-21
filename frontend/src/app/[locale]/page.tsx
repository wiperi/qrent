import FilterModal from '@/components/FilterModal'
import HeroSection from '@/components/HeroSection'
import PropertyGrid from '@/components/PropertyGrid'
import { Suspense } from 'react'

export default function Home() {
  return (
    <main>
      <HeroSection />
      {/* <UsefulGuide /> */}
      <PropertyGrid />
      <Suspense fallback={null}>
        <FilterModal />
      </Suspense>
    </main>
  )
}