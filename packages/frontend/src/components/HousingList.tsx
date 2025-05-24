// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

// this file is for just landed page

'use client';
import { useState, useEffect, useRef } from 'react';
import { useFilterStore } from '../store/useFilterStore';
import HouseCard from './HouseCard';
import { SUBURB_OPTIONS } from './HousingFilter';

const HousingListInEfficiencyFilter = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPage, setTotalPage] = useState(1);
  const { filter, updateFilter } = useFilterStore();
  const [hasMore, setHasMore] = useState(true);

  const topRef = useRef();

  const fetchData = async () => {
    setLoading(true);
    try {
      const requestBody = {};

      if (filter.priceMin !== 'Any' && filter.priceMin !== '' && filter.priceMin !== undefined) {
        requestBody.minPrice = parseInt(filter.priceMin);
      }

      if (filter.priceMax !== 'Any' && filter.priceMax !== '' && filter.priceMax !== undefined) {
        requestBody.maxPrice = parseInt(filter.priceMax);
      }

      if (
        filter.bedroomMin !== 'Any' &&
        filter.bedroomMin !== '' &&
        filter.bedroomMin !== undefined
      ) {
        requestBody.minBedrooms = parseInt(filter.bedroomMin);
      }

      if (
        filter.bedroomMax !== 'Any' &&
        filter.bedroomMax !== '' &&
        filter.bedroomMax !== undefined
      ) {
        requestBody.maxBedrooms = parseInt(filter.bedroomMax);
      }

      if (
        filter.bathroomMin !== 'Any' &&
        filter.bathroomMin !== '' &&
        filter.bathroomMin !== undefined
      ) {
        requestBody.minBathrooms = parseInt(filter.bathroomMin);
      }

      if (
        filter.bathroomMax !== 'Any' &&
        filter.bathroomMax !== '' &&
        filter.bathroomMax !== undefined
      ) {
        requestBody.maxBathrooms = parseInt(filter.bathroomMax);
      }

      if (filter.area && filter.area.length > 0) {
        requestBody.regions = filter.area.join(' ');
      } else {
        // if filter area is empty, user didn't choose any region
        // then set region based on school
        if (filter.university == 'UNSW') {
          requestBody.regions = SUBURB_OPTIONS.unsw.join(' ');
        } else {
          // else, USYD
          requestBody.regions = SUBURB_OPTIONS.usyd.join(' ');
        }
      }

      if (
        filter.propertyType !== 'Any' &&
        filter.propertyType !== '' &&
        filter.propertyType !== undefined
      ) {
        switch (filter.propertyType) {
          case 'House':
            requestBody.propertyType = 1;
            break;
          case 'Apartment/Unit/Flat':
            requestBody.propertyType = 2;
            break;
          case 'Studio':
            requestBody.propertyType = 3;
            break;
          case 'Semi-detached':
            requestBody.propertyType = 4;
            break;
        }
      }

      if (
        filter.commuteTimeMin !== 'Any' &&
        filter.commuteTimeMin !== '' &&
        filter.commuteTimeMin !== undefined
      ) {
        requestBody.minCommuteTime = parseInt(filter.commuteTimeMin);
      }

      if (
        filter.commuteTimeMax !== 'Any' &&
        filter.commuteTimeMax !== '' &&
        filter.commuteTimeMax !== undefined
      ) {
        requestBody.maxCommuteTime = parseInt(filter.commuteTimeMax);
      }

      requestBody.minRating = parseInt(filter.rate);

      if (
        filter.avaliableDate !== 'Any' &&
        filter.avaliableDate !== '' &&
        filter.avaliableDate !== undefined
      ) {
        requestBody.moveInDate = filter.avaliableDate;
      }

      requestBody.page = 1;
      requestBody.pageSize = 1000000;

      requestBody.publishedAt = new Date().toDateString();

      requestBody.orderBy = [
        {
          averageScore: 'desc',
        },
      ];

      console.log(requestBody);

      const response = await fetch('/api/properties/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      const results = await response.json();

      if (results.length == 0) {
        setHasMore(false);
      }

      setTotalPage(Math.ceil(results.length / 10));

      setListings(results);
    } catch (error) {
      console.error('Error fetching properties:', error);
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
      {listings.slice((currentPage - 1) * 10, currentPage * 10).map((house, index) => (
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

        <button
          onClick={handleNextPage}
          disabled={!hasMore}
          className="px-4 py-2 border rounded disabled:opacity-50"
        >
          &gt;
        </button>
      </div>
    </div>
  );
};

export default HousingListInEfficiencyFilter;
