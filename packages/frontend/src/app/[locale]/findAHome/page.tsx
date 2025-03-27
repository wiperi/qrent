'use client';
import HousingFilter from '@/src/components/HousingFilter';
import HousingList from '@/src/components/HousingList';
import React, { useEffect, useState } from 'react';

const page = () => {
  const [filter, setFilter] = useState({
    university: 'Any',
    priceMin: 'Any',
    priceMax: 'Any',
    travelTime: 'Any',
    bedroomMin: 'Any',
    bedroomMax: 'Any',
    bathroomMin: 'Any',
    bathroomMax: 'Any',
    propertyType: 'Any',
    area: 'Any',
    rate: 0,
    avaliableDate: 'Any',
  });

  // Load filter from localStorage when the component mounts
  useEffect(() => {
    const storedFilter = localStorage.getItem('filter');
    if (storedFilter) {
      setFilter(JSON.parse(storedFilter));
    }
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      const updatedFilter = localStorage.getItem('filter');
      if (updatedFilter) {
        setFilter(JSON.parse(updatedFilter));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <div className="min-h-auto">
      {/* Main Content Layout */}
      <div className="flex flex-col lg:flex-row">
        {/* Left: Filter Sidebar */}
        <section className="flex-[2] bg-gray-50 rounded-lg p-5 shadow-md h-auto overflow-y-auto">
          <HousingFilter filter={filter} setFilter={setFilter} />
        </section>

        {/* Right: Housing Listings */}
        <section className="flex-[8] col-span-2 bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Properties in Sydney</h2>
          <HousingList filter={filter} />
        </section>
      </div>
    </div>
  );
};

export default page;
