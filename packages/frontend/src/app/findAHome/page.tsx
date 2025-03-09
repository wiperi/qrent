"use client";
import HousingFilter from "@/src/components/HousingFilter";
import HousingList from "@/src/components/HousingList";
import React, { useState } from "react";

const page = () => {
  const [filters, setFilters] = useState({});

  return (
    <div className="min-h-screen">
      {/* Main Content Layout */}
      <div className="flex flex-col lg:flex-row gap-6 px-6 mt-6">
        {/* Left: Filter Sidebar */}
        <section className="flex-[3] bg-gray-50 rounded-lg p-5 shadow-md h-auto overflow-y-auto">
          <HousingFilter onFilterChange={setFilters} />
        </section>

        {/* Right: Housing Listings */}
        <section className="flex-[7] bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Available Listings</h2>
          <HousingList filters={filters} />
        </section>
      </div>
    </div>
  );
};

export default page;
