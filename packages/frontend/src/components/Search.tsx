import React from "react";

const Search = () => {
  return (
    <div className="bg-none py-8 px-6 border-b-0 mb-10 max-w-screen-lg mx-auto mt-8">
      <div className="flex gap-4 bg-white p-4 rounded-lg shadow-md transition-transform duration-200 hover:translate-y-[-2px] hover:shadow-lg hover:border-primary">
        {/* Area */}
        <div className="flex-1 flex flex-col border-r border-gray-300 pr-4">
          <label className="text-sm">Area</label>
          <input
            type="text"
            className="mt-2 px-4 py-2 border border-gray-300 rounded-lg"
            placeholder="Near UNSW, Kingsford, Kensington..."
          />
        </div>

        {/* Price Range */}
        <div className="flex-1 flex flex-col border-r border-gray-300 pr-4">
          <label className="text-sm">Price Range</label>
          <input
            type="text"
            className="mt-2 px-4 py-2 border border-gray-300 rounded-lg"
            placeholder="$300-$500/week"
          />
        </div>

        {/* Property Type */}
        <div className="flex-1 flex flex-col border-r border-gray-300 pr-4">
          <label className="text-sm">Property Type</label>
          <input
            type="text"
            className="mt-2 px-4 py-2 border border-gray-300 rounded-lg"
            placeholder="Studio, Master Bedroom, Independent Apartment..."
          />
        </div>

        {/* Keywords */}
        <div className="flex-1 flex flex-col pr-4">
          <label className="text-sm">Keywords</label>
          <input
            type="text"
            className="mt-2 px-4 py-2 border border-gray-300 rounded-lg"
            placeholder="Fully Furnished, All Bills Included, Quiet..."
          />
        </div>

        {/* Filter Button */}
        <div className="flex items-center justify-center w-full md:w-auto mt-4">
          <button
            className="px-6 py-3 bg-blue-primary text-white rounded-lg hover:bg-primary-dark"
            onClick={() => (window.location.href = "housing-filter.html")}
          >
            <i className="fas fa-filter"></i> Filter Properties
          </button>
        </div>
      </div>
    </div>
  );
};

export default Search;
