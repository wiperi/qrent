'use client'

import PropertyCard from './PropertyCard'
import Section from './Section'
import { useMutation } from '@tanstack/react-query'
import { useTRPC } from '@/lib/trpc'
import { SCHOOL } from '@qrent/shared/enum'
import { useEffect } from 'react'

export default function PropertyGrid() {
  const trpc = useTRPC()
  const { mutate, data, isPending, error } = useMutation(trpc.properties.search.mutationOptions())

  useEffect(() => {
    mutate({
      targetSchool: SCHOOL.UNSW,
      pageSize: 8,
      page: 1,
    })
  }, [mutate])

  if (isPending) {
    return (
      <Section title="Daily New Houses">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="p-4 space-y-3">
                <div className="h-4 bg-slate-200 rounded w-2/3" />
                <div className="h-3 bg-slate-200 rounded w-1/2" />
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-3 bg-slate-200 rounded w-full" />
                <div className="h-3 bg-slate-200 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </Section>
    )
  }

  if (error) {
    return (
      <Section title="Daily New Houses">
        <div className="text-center py-8">
          <p className="text-slate-600">Unable to load properties. Please try again later.</p>
        </div>
      </Section>
    )
  }

  const properties = data?.properties || []

  return (
    <Section title="Daily New Houses">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {properties.map((property) => (
          <PropertyCard
            key={property.id}
            address={property.address}
            region={property.region}
            price={property.price}
            bedroomCount={property.bedroomCount}
            bathroomCount={property.bathroomCount}
            propertyType={property.propertyType}
            descriptionEn={property.descriptionEn}
            commuteTime={property.commuteTime}
            url={property.url}
          />
        ))}
      </div>
    </Section>
  )
}


