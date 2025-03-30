// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

'use client';
import { useState, useEffect } from 'react';
import JustLandedHouseCard from './JustLandedHouseCard';
import { useTranslations } from 'next-intl';

async function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_BACKEND_URL_OLD || 'http://localhost:5000';
}

const HousingList = () => {
  const t = useTranslations('JustLanded');
  const [school] = useState('unsw');
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
          body: JSON.stringify({}),
        });

        if (!response.ok) throw new Error('Failed to fetch listings');

        const houses = await response.json();
        setListings(houses);

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

  return (
    <div className="grid grid-cols-1 gap-4 overflow-y-auto max-h-[700px]">
      <span className="text-gray-800 px-4 py-2 border-b border-gray-200 text-center text-lg font-semibold mb-3">
        <span className="text-3xl font-bold">{updateCount}</span> {t('n-properties-update')}!
      </span>
      {/* Content */}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && !error && listings.length === 0 && <p>No new listings available.</p>}

      {listings.map((house, index) => (
        <JustLandedHouseCard key={index} house={house} />
      ))}
    </div>
  );
};

export default HousingList;
