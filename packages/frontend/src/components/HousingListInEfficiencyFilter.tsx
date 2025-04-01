// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

'use client';
import { useState, useEffect } from 'react';
import JustLandedHouseCard from './JustLandedHouseCard';
import { useTranslations } from 'next-intl';

async function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_BACKEND_URL_OLD || 'http://localhost:5000';
}

const HousingListInEfficiencyFilter = () => {
  const t = useTranslations('JustLanded');
  const [school] = useState('unsw');
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  const getFilterValues = () => {
    const filters = {
      page: currentPage,
      page_size: pageSize,
    };

    return filters;
  };

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
    const filters = getFilterValues();

    try {
      const apiUrl = await buildApiUrl(filters);
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
  };

  const handlePrevPage = () => {
    setCurrentPage(prevPage => (prevPage > 1 ? prevPage - 1 : 1));
  };

  useEffect(() => {
    fetchData();
  }, [currentPage, pageSize]);

  return (
    <div className="grid grid-cols-1 gap-4 overflow-y-auto max-h-[700px]">
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
