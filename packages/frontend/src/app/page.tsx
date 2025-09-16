import { Suspense } from 'react'
import Header from '@/components/Header'
import HeroSection from '@/components/HeroSection'
import PropertyGrid from '@/components/PropertyGrid'
import Footer from '@/components/Footer'
import FilterModal from '@/components/FilterModal'

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        {/* <UsefulGuide /> */}
        <PropertyGrid />
        <Suspense fallback={null}>
          <FilterModal />
        </Suspense>
      </main>
      <Footer />
    </>
  )
}