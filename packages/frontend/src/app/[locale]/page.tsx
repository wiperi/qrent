import FilterModal from '@/components/FilterModal'
import HeroSection from '@/components/HeroSection'
import PropertyGrid from '@/components/PropertyGrid'
import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale })
  
  return {
    title: t('home.title', { default: 'Qrent - Your Perfect Home Awaits' }),
    description: t('home.description', {
      default: 'Discover exceptional rental properties with ease. Your dream home is just a search away.'
    }),
    openGraph: {
      title: t('home.title', { default: 'Qrent - Your Perfect Home Awaits' }),
      description: t('home.description', {
        default: 'Discover exceptional rental properties with ease. Your dream home is just a search away.'
      }),
    },
    twitter: {
      title: t('home.title', { default: 'Qrent - Your Perfect Home Awaits' }),
      description: t('home.description', {
        default: 'Discover exceptional rental properties with ease. Your dream home is just a search away.'
      }),
    },
  }
}

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