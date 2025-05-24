'use client';
import HousingFilter from '@/src/components/HousingFilter';
import HousingList from '@/src/components/HousingList';
import React from 'react';

const Page = () => {
  return (
    <div className="min-h-auto">
      {/* Main Content Layout */}
      <div className="flex flex-col lg:flex-row">
        {/* Left: Filter Sidebar */}
        <section className="flex-[2] bg-gray-50 rounded-lg p-5 shadow-md h-screen sticky top-0 overflow-y-auto">
          <HousingFilter />
        </section>

        {/* Right: Housing Listings */}
        <section className="flex-[8] col-span-2 bg-white shadow-lg rounded-lg p-6">
          <HousingList />
        </section>
      </div>
    </div>
  );
};

export default Page;
