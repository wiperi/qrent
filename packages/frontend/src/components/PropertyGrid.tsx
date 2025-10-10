'use client';

import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useTRPCClient } from '@/lib/trpc';
import PropertyCard from './PropertyCard';

export default function PropertyGrid() {
  const searchParams = useSearchParams();
  const university = searchParams.get('university') || 'unsw';
  const trpc = useTRPCClient();

  const { isPending, error, data } = useQuery({
    queryKey: ['properties', university],
    queryFn: () => trpc.properties.list.query({ university }),
  });

  if (isPending) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="bg-slate-100 animate-pulse rounded-2xl h-64"></div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500">Error: {error.message}</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-slate-500">No properties found for this university.</p>
      </div>
    );
  }

  // 按平均分数从高到低排序房源数据
  const sortedData = [...data].sort(
    (a, b) => (b.averageScore || 0) - (a.averageScore || 0)
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {sortedData.map(property => (
        <PropertyCard
          key={property.id}
          address={property.address}
          region={property.region}
          price={property.price}
          bedroomCount={property.bedroomCount}
          bathroomCount={property.bathroomCount}
          propertyType={property.propertyType}
          commuteTime={property.commuteTime}
          url={property.url}
          averageScore={property.averageScore}
          keywords={property.keywords}
          availableDate={property.availableDate}
        />
      ))}
    </div>
  );
}
