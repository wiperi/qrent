// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

'use client';
import { useState, useEffect } from 'react';
import JustLandedHouseCard from './JustLandedHouseCard';
import { useFilterStore } from '../store/useFilterStore';

const HousingListInEfficiencyFilter = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { filter, updateFilter } = useFilterStore();

  const buildApiUrl = async filters => {
    const endpoint = '/api/data';

    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(v => queryParams.append(key, v));
        } else {
          queryParams.append(key, value);
        }
      }
    });

    return `${endpoint}?${queryParams.toString()}`;
  };

  const fetchData = async () => {
    setLoading(true);

    try {
      const apiUrl = await buildApiUrl(filter);
      const response = await fetch(apiUrl);

      const result = await response.json();
      setListings(result.data);
      setTotalPages(result.total_pages);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNextPage = () => {
    setCurrentPage(prevPage => prevPage + 1);
    updateFilter({ ...filter, page: currentPage });
  };

  const handlePrevPage = () => {
    setCurrentPage(prevPage => (prevPage > 1 ? prevPage - 1 : 1));
    updateFilter({ ...filter, page: currentPage });
  };

  useEffect(() => {
    fetchData();
  }, [currentPage, filter]);

  return (
    <div className="grid grid-cols-1 gap-4 overflow-y-auto max-h-[900px]">
      {/* Error Message */}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && !error && listings.length === 0 && <p>No new listings available.</p>}

      {/* Display Current Listings */}
      {listings.map((house, index) => (
        <JustLandedHouseCard key={index} house={house} />
      ))}

      {/* Pagination Controls */}
      <div className="flex justify-center space-x-2 mt-4">
        <button
          onClick={handlePrevPage}
          disabled={currentPage === 1}
          className="px-4 py-2 border rounded disabled:opacity-50"
        >
          &lt;
        </button>
        <span className="px-4 py-2">
          {currentPage} / {totalPages}
        </span>
        <button
          onClick={handleNextPage}
          disabled={currentPage === totalPages}
          className="px-4 py-2 border rounded disabled:opacity-50"
        >
          &gt;
        </button>
      </div>
    </div>
  );
};

export default HousingListInEfficiencyFilter;
