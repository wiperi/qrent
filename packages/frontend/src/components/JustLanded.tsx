// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faSpinner, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { useTranslations } from 'next-intl';
import JustLandedHouseCard from './JustLandedHouseCard';

const JustLanded = () => {
  const [school, setSchool] = useState('unsw');
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error] = useState(null);
  // const [updateCount, setUpdateCount] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const requestBody = {};

      requestBody.targetSchool = school;
      requestBody.page = 1;
      requestBody.pageSize = 50;
      requestBody.orderBy = [
        {
          publishedAt: 'desc'
        }
      ]

      console.log(requestBody);

      const response = await fetch('/api/properties/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      let results = await response.json();

      for (const result of results) {
        if (result.url == 'https://www.domain.com.au/nan' || result.addressLine1 == null) {
          results.splice(results.indexOf(result), 1);
        }
      }

      results.sort((a, b) => b.averageScore - a.averageScore);
      console.log(results);

      results = results.slice(0, 9);

      setListings(results);
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [school]);

  const t = useTranslations('JustLanded');

  return (
    <div className="max-w-screen-lg mx-auto mt-10 px-6">
      {/* Section Header */}
      <div className="flex justify-between items-center border-b pb-2 mb-4">
        {/* Title + Controls */}
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <FontAwesomeIcon icon={faHome} className="text-blue-primary" />
            {t('just-landed')}
          </h2>
          {/* School Toggle Buttons */}
          <div className="flex border rounded-lg overflow-hidden">
            <button
              className={`px-3 py-2 ${
                school === 'unsw' ? 'bg-blue-primary text-white' : 'bg-gray-200'
              }`}
              onClick={() => setSchool('unsw')}
            >
              UNSW
            </button>
            <button
              className={`px-3 py-1 ${
                school === 'usyd' ? 'bg-blue-primary text-white' : 'bg-gray-200'
              }`}
              onClick={() => setSchool('usyd')}
            >
              USYD
            </button>
          </div>
          {/* Subscribe Button */}
          {/* <button className="flex items-center gap-2 bg-blue-primary text-white px-4 py-2 rounded-lg hover:bg-blue-900 transition">
            <FontAwesomeIcon icon={faBell} />
            {t('subscribe')}
          </button> */}
        </div>
        {/* <div className="ml-auto flex items-center gap-3">
          <span className="bg-gray-200 px-3 py-1 rounded-full text-sm">
            {t('updates')}: {updateCount}
          </span>
        </div> */}
        <Link
          href="/justLanded"
          className="text-blue-primary hover:underline flex items-center ml-2"
        >
          {t('view-all')} <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
        </Link>
      </div>
      {/* Loading State */}
      {loading && (
        <div className="flex items-center gap-2 text-gray-500">
          <FontAwesomeIcon icon={faSpinner} spin />
          Loading latest listings...
        </div>
      )}

      {/* Content */}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && !error && listings.length === 0 && <p>No new listings available.</p>}

      <div className="max-w-screen-lg mx-auto mt-10 mb-20 px-6 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((house, index) => (
            <JustLandedHouseCard key={index} house={house} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default JustLanded;
