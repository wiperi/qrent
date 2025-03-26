'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHome,
  faBell,
  faSpinner,
  faExclamationCircle,
  faArrowRight,
} from '@fortawesome/free-solid-svg-icons';
import HouseCard from './HouseCard';
import { useTranslations } from 'next-intl';

async function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
}

const JustLanded = () => {
  const [school, setSchool] = useState('unsw');
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [updateCount, setUpdateCount] = useState(0);
  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      setError(null);

      try {
        const baseUrl = await getApiBaseUrl();
        console.log(baseUrl);
        const endpoint =
          school === 'unsw' ? '/api/daily-houses/list' : '/api/daily-houses/usyd/list';

        const response = await fetch(`${baseUrl}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ min_score: 14, limit: 9 }),
        });

        if (!response.ok) throw new Error('Failed to fetch listings');

        const houses = await response.json();
        setListings(houses.slice(0, 9));

        // Fetch update count
        const statsEndpoint =
          school === 'unsw' ? '/api/daily-houses/stats' : '/api/daily-houses/usyd/stats';
        const statsResponse = await fetch(`${baseUrl}${statsEndpoint}`);

        if (statsResponse.ok) {
          const stats = await statsResponse.json();
          setUpdateCount(stats.todayCount || houses.length);
        } else {
          setUpdateCount(houses.length);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
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
          <button className="flex items-center gap-2 bg-blue-primary text-white px-4 py-2 rounded-lg hover:bg-blue-900 transition">
            <FontAwesomeIcon icon={faBell} />
            {t('subscribe')}
          </button>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="bg-gray-200 px-3 py-1 rounded-full text-sm">
            {t('updates')}: {updateCount}
          </span>
        </div>
        <Link
          href="/justLanded"
          className="text-blue-primary hover:underline flex items-center ml-2"
        >
          {t('view-all')} <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
        </Link>
      </div>

      {/* Section Actions */}

      {/* Section Actions */}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center gap-2 text-gray-500">
          <FontAwesomeIcon icon={faSpinner} spin />
          Loading latest listings...
        </div>
      )}

      {/* Error State */}
      {/* {error && (
        <div className="flex items-center gap-2 text-red-500">
          <FontAwesomeIcon icon={faExclamationCircle} />
          Failed to load listings. Please try again.
          <button
            className="bg-red-500 text-white px-4 py-1 rounded-lg ml-2"
            onClick={() => fetchListings(school)}
          >
            Retry
          </button>
        </div>
      )} */}

      {/* Content */}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && !error && listings.length === 0 && <p>No new listings available.</p>}

      <div className="max-w-screen-lg mx-auto mt-10 mb-20 px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((house, index) => (
            <HouseCard key={index} house={house} />
          ))}
        </div>
      </div>
    </div>
  );
};
// };

export default JustLanded;
