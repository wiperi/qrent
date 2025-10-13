import { Suspense } from 'react'
import HeroSection from '@/components/HeroSection'
import PropertyGrid from '@/components/PropertyGrid'
import FilterModal from '@/components/FilterModal'

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