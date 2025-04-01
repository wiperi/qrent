'use client';
import HousingFilter from '@/src/components/HousingFilter';
import HousingListInEfficiencyFilter from '@/src/components/HousingListInEfficiencyFilter';
import { useFilterStore } from '@/src/store/useFilterStore';
import React from 'react';

const Page = () => {
  const { filter, updateFilter } = useFilterStore();
  // TODO: Housing list add filter filtering
  return (
    <div className="min-h-auto">
      {/* Main Content Layout */}
      <div className="flex flex-col lg:flex-row">
        {/* Left: Filter Sidebar */}
        <section className="flex-[2] bg-gray-50 rounded-lg p-5 shadow-md h-auto overflow-y-auto">
          <HousingFilter filter={filter} setFilter={updateFilter} />
        </section>

        {/* Right: Housing Listings */}
        <section className="flex-[8] col-span-2 bg-white shadow-lg rounded-lg p-6">
          <HousingListInEfficiencyFilter />
        </section>
      </div>
    </div>
  );
};

export default Page;
