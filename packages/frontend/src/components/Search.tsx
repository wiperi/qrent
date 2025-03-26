import { useEffect, useState } from 'react';
import PriceDropdown from './priceDropDown';
import bgImg from '../../public/searchBG.jpg';
import MoreFilterModal from './MoreFilterModal';
import { useTranslations } from 'next-intl';

export default function Search() {
  const [filter, setFilter] = useState({
    university: 'UNSW',
    priceMin: 'Any',
    priceMax: 'Any',
    travelTime: 'Any',
    bedroomMin: 'Any',
    bedroomMax: 'Any',
    bathroomMin: 'Any',
    bathroomMax: 'Any',
    propertyType: 'Any',
    area: 'Any',
    rate: 0,
    avaliableDate: 'Any',
  });

  // Load saved filter from localStorage on first render
  useEffect(() => {
    const storedFilter = localStorage.getItem('filter');
    if (storedFilter) {
      setFilter(JSON.parse(storedFilter));
    }
  }, []);

  // Save filter to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('filter', JSON.stringify(filter));
  }, [filter]);

  const t = useTranslations('Search');

  return (
    <>
      <section
        className="hero bg-cover h-56"
        style={{
          backgroundImage: `url(${bgImg.src})`,
        }}
      >
        <h1 className="text-white drop-shadow-2xl absolute top-28 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl font-bold font-serif">
          Find Your Dream Home
        </h1>
        <div className="bg-white p-4 shadow rounded-lg flex gap-4 font-semibold justify-between flex-wrap mt-8 mx-auto max-w-screen-lg w-full">
          <div className="flex-1">
            <div className="text-sm text-gray-600">{t('university')}</div>
            <select
              className="border rounded px-2 py-1 max-h-40 overflow-y-auto w-full"
              value={filter.university}
              onChange={e => setFilter({ ...filter, university: e.target.value })}
            >
              <option>UNSW</option>
              <option>USYD</option>
            </select>
          </div>

          <div className="flex-1">
            <PriceDropdown
              label={t('price-min')}
              name="priceMin"
              filter={filter}
              setFilter={setFilter}
            />
          </div>

          <div className="flex-1">
            <PriceDropdown
              label={t('price-max')}
              name="priceMax"
              filter={filter}
              setFilter={setFilter}
            />
          </div>

          <div className="flex-1">
            <div className="text-sm text-gray-600">{t('travel-time')}</div>
            <select
              className="border rounded px-2 py-1 max-h-40 overflow-y-auto w-full"
              value={filter.travelTime}
              onChange={e => setFilter({ ...filter, travelTime: e.target.value })}
            >
              <option>Any</option>
              <option>10 min</option>
              <option>20 min</option>
              <option>30 min</option>
              <option>40 min</option>
              <option>50 min</option>
              <option>1h</option>
              <option>1.5h</option>
              <option>2h</option>
            </select>
          </div>

          <div className="flex gap-4">
            <MoreFilterModal filter={filter} setFilter={setFilter} />
            <button className="bg-blue-primary text-white px-4 py-1 rounded mt-4">
              <a href="/findAHome">Go</a>
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
