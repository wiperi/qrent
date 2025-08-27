// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

'use client';
import { useState, useEffect, useRef } from 'react';
import { useFilterStore } from '../store/useFilterStore';
import HouseCard from './HouseCard';
import { filterReportStore } from '../store/filterReportStore';
import { SCHOOL } from '@/qrent/shared/enum';

const HousingListInEfficiencyFilter = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPage, setTotalPage] = useState(1);
  const [topRegions, setTopRegions] = useState([]);

  const { filter, updateFilter } = useFilterStore();
  const { updateReport } = filterReportStore();

  const topRef = useRef();

  const fetchData = async () => {
    setLoading(true);
    try {
      const requestBody: Record<string, any> = {};

      const isValid = (val: any) =>
        val !== 'Any' && val !== '' && val !== undefined && val !== null;

      const parseIfValid = (val: any) => (isValid(val) ? parseInt(val) : undefined);

      // Price
      if (isValid(filter.priceMin)) requestBody.minPrice = parseIfValid(filter.priceMin);
      if (isValid(filter.priceMax)) requestBody.maxPrice = parseIfValid(filter.priceMax);

      // Bedrooms
      if (isValid(filter.bedroomMin)) requestBody.minBedrooms = parseIfValid(filter.bedroomMin);
      if (isValid(filter.bedroomMax)) requestBody.maxBedrooms = parseIfValid(filter.bedroomMax);

      // Bathrooms
      if (isValid(filter.bathroomMin)) requestBody.minBathrooms = parseIfValid(filter.bathroomMin);
      if (isValid(filter.bathroomMax)) requestBody.maxBathrooms = parseIfValid(filter.bathroomMax);

      // Commute time
      if (isValid(filter.commuteTimeMin))
        requestBody.minCommuteTime = parseIfValid(filter.commuteTimeMin);
      if (isValid(filter.commuteTimeMax))
        requestBody.maxCommuteTime = parseIfValid(filter.commuteTimeMax);

      // Rating
      requestBody.minRating = parseIfValid(filter.rate) ?? 0;

      // Property type
      const propertyTypeMap: Record<string, number> = {
        House: 1,
        'Apartment/Unit/Flat': 2,
        Studio: 3,
        'Semi-detached': 4,
      };
      if (isValid(filter.propertyType)) {
        requestBody.propertyType = propertyTypeMap[filter.propertyType];
      }

      // School
      if (filter.university === 'UNSW') {
        requestBody.targetSchool = SCHOOL.UNSW;
      } else if (filter.university === 'USYD') {
        requestBody.targetSchool = SCHOOL.USYD;
      } else {
        requestBody.targetSchool = SCHOOL.UTS;
      }

      // Area
      if (Array.isArray(filter.area) && filter.area.length && !filter.area.includes('Any')) {
        requestBody.regions = filter.area.join(' ');
      }

      // Move-in date
      if (isValid(filter.avaliableDate)) {
        requestBody.moveInDate = new Date(filter.avaliableDate);
      }

      // New Today
      if (filter.newToday) {
        requestBody.publishedAt = new Date().toISOString().split('T')[0];
      }

      requestBody.page = currentPage;
      requestBody.pageSize = 10;
      requestBody.orderBy = [{ averageScore: 'desc' }];

      console.log('Sending request:', requestBody);

      const response = await fetch('/api/properties/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const results = await response.json();

      // Sort and set
      const sorted = results.properties.sort((a, b) => b.averageScore - a.averageScore);
      setListings(sorted);
      setTopRegions(results.topRegions);

      setTotalPage(Math.ceil(results.filteredCount / 10));
      updateReport({
        currentListings: results.filteredCount,
        totalListings: results.totalCount,
        avgRent: results.averagePrice,
        avgTravelTime: results.averageCommuteTime,
        topRegions: results.topRegions,
      });
    } catch (error) {
      console.error('Failed to fetch properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNextPage = () => {
    setCurrentPage(prevPage => prevPage + 1);
    updateFilter({ ...filter, page: currentPage });
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handlePrevPage = () => {
    setCurrentPage(prevPage => (prevPage > 1 ? prevPage - 1 : 1));
    updateFilter({ ...filter, page: currentPage });
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    fetchData();
  }, [filter]);

  return (
    <div ref={topRef} className="grid grid-cols-1 gap-4">
      {/* Error Message */}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && !error && listings.length === 0 && <p>No new listings available.</p>}

      {/* Display Current Listings */}
      {listings.map((house, index) => (
        <HouseCard key={index} house={house} />
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

        <div className="px-4 py-2 text-sm">
          {currentPage} / {totalPage}
        </div>

        <button onClick={handleNextPage} className="px-4 py-2 border rounded disabled:opacity-50">
          &gt;
        </button>
      </div>
    </div>
  );
};

export default HousingListInEfficiencyFilter;
