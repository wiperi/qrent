"use client";
import Hero from "../components/Hero";

export default function Home() {
  return (
    <main>
      <Hero />

      <div className="flex gap-4 bg-white p-4 rounded-lg shadow-md transition-transform duration-200 hover:translate-y-[-2px] hover:shadow-lg hover:border-primary">
        <div className="flex-1 flex flex-col border-r border-gray-300 pr-4">
          <label className="text-sm">Area</label>
          <input
            type="text"
            className="mt-2 px-4 py-2 border border-gray-300 rounded-lg"
            placeholder="Near UNSW, Kingsford, Kensington..."
          />
        </div>
        <div className="flex-1 flex flex-col border-r border-gray-300 pr-4">
          <label className="text-sm">Price Range</label>
          <input
            type="text"
            className="mt-2 px-4 py-2 border border-gray-300 rounded-lg"
            placeholder="$300-$500/week"
          />
        </div>
        <div className="flex-1 flex flex-col border-r border-gray-300 pr-4">
          <label className="text-sm">Property Type</label>
          <input
            type="text"
            className="mt-2 px-4 py-2 border border-gray-300 rounded-lg"
            placeholder="Studio, Master Bedroom, Independent Apartment..."
          />
        </div>
        <div className="flex-1 flex flex-col pr-4">
          <label className="text-sm">Keywords</label>
          <input
            type="text"
            className="mt-2 px-4 py-2 border border-gray-300 rounded-lg"
            placeholder="Fully Furnished, All Bills Included, Quiet..."
          />
        </div>
        <button
          className="flex items-center px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark ml-4"
          onClick={() => (window.location.href = "housing-filter.html")}
        >
          <i className="fas fa-filter"></i> Filter Properties
        </button>
      </div>
    </main>
  );
}
