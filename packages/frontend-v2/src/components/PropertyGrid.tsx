'use client';

import PropertyCard from './PropertyCard';
import Section from './Section';
import { useQuery } from '@tanstack/react-query';
import { useTRPCClient } from '@/lib/trpc';
import { SCHOOL } from '@qrent/shared/enum';
import { useState } from 'react';

export default function PropertyGrid() {
  const [selectedUniversity, setSelectedUniversity] = useState(SCHOOL.UNSW);
  const trpc = useTRPCClient();
  const { data, isPending, error } = useQuery({
    queryKey: ['properties.search', selectedUniversity],
    queryFn: () =>
      trpc.properties.search.query({
        targetSchool: selectedUniversity,
        pageSize: 8,
        page: 1,
        orderBy: [
          {
            availableDate: 'desc' as const,
          },
          {
            averageScore: 'desc' as const,
          },
        ],
      }),
  });

  const getUniversityColors = (school: string, isSelected: boolean) => {
    const colors = {
      [SCHOOL.UNSW]: {
        selected: 'bg-yellow-400 text-black',
        hover: 'hover:bg-yellow-100 hover:text-yellow-800',
      },
      [SCHOOL.USYD]: {
        selected: 'bg-blue-800 text-yellow-400',
        hover: 'hover:bg-blue-100 hover:text-blue-800',
      },
      [SCHOOL.UTS]: {
        selected: 'bg-blue-500 text-orange-400',
        hover: 'hover:bg-blue-100 hover:text-blue-600',
      },
    };

    return isSelected
      ? colors[school as keyof typeof colors]?.selected || 'bg-blue-600 text-white'
      : colors[school as keyof typeof colors]?.hover || 'hover:text-blue-600';
  };

  const sectionTitle = (
    <div className="flex items-center gap-3">
      <span>Daily New Houses Around</span>
      <div className="flex rounded-lg border border-slate-200 bg-slate-50">
        {Object.values(SCHOOL).map(school => (
          <button
            key={school}
            onClick={() => setSelectedUniversity(school)}
            className={`px-3 py-2 transition-colors rounded-md ${
              selectedUniversity === school
                ? `${getUniversityColors(school, true)} shadow-sm`
                : getUniversityColors(school, false)
            }`}
          >
            {school}
          </button>
        ))}
      </div>
    </div>
  );

  if (isPending) {
    return (
      <Section title={sectionTitle}>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white"
            >
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
    );
  }

  if (error) {
    return (
      <Section title={sectionTitle}>
        <div className="text-center py-8">
          <p className="text-slate-600">Unable to load properties. Please try again later.</p>
        </div>
      </Section>
    );
  }

  const properties = data?.properties || [];

  return (
    <Section title={sectionTitle}>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {properties.map(property => (
          <PropertyCard
            key={property.id}
            address={property.address}
            region={property.region || ''}
            price={property.price}
            bedroomCount={property.bedroomCount}
            bathroomCount={property.bathroomCount}
            propertyType={property.propertyType}
            descriptionEn={property.descriptionEn || ''}
            commuteTime={property.commuteTime ?? undefined}
            url={property.url}
            averageScore={property.averageScore}
            keywords={property.keywords}
          />
        ))}
      </div>
    </Section>
  );
}
