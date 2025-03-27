import React from 'react';
import PriceDropdown from './priceDropDown';
import RatingSlider from './Slider';
import { useTranslations } from 'next-intl';

const HousingFilter = ({ filter, setFilter }) => {
  const t = useTranslations('Search');
  return (
    <>
      {/* University */}
      <div className="mt-4">
        <div className="text-lg text-gray-600 font-bold">{t('university')}</div>
        <select
          className="border rounded px-2 py-1 max-h-40 overflow-y-auto w-full"
          value={filter.university}
          onChange={e => setFilter({ ...filter, university: e.target.value })}
        >
          <option>Any</option>
          <option>UNSW</option>
          <option>USYD</option>
        </select>
      </div>

      {/* Price Range */}
      <div className="mt-4">
        <div className="text-lg text-gray-600 font-bold">{t('price')}</div>
        <div className="flex justify-between gap-4">
          <div className="flex-1">
            <PriceDropdown label="Min" name="priceMin" filter={filter} setFilter={setFilter} />
          </div>
          <div className="flex-1">
            <PriceDropdown label="Max" name="priceMax" filter={filter} setFilter={setFilter} />
          </div>
        </div>
      </div>

      {/* BedroomNum */}
      <div className="mt-4">
        <div className="text-lg text-gray-600 font-bold">{t('bedrooms')}s</div>
        <div className="flex justify-between gap-4">
          <div className="flex-1">
            <div className="text-sm text-gray-600">Min</div>
            <select
              className="border rounded px-2 py-1 max-h-40 overflow-y-auto w-full"
              value={filter.bedroomMin}
              onChange={e => setFilter({ ...filter, bedroomMin: e.target.value })}
            >
              <option>Any</option>
              <option>1</option>
              <option>2</option>
              <option>3</option>
            </select>
          </div>
          <div className="flex-1">
            <div className="text-sm text-gray-600">Max</div>
            <select
              className="border rounded px-2 py-1 max-h-40 overflow-y-auto w-full"
              value={filter.bedroomMax}
              onChange={e => setFilter({ ...filter, bedroomMax: e.target.value })}
            >
              <option>Any</option>
              <option>1</option>
              <option>2</option>
              <option>3</option>
            </select>
          </div>
        </div>
      </div>

      {/* BathroomNum */}
      <div className="mt-4">
        <div className="text-lg text-gray-600 font-bold">{t('bathrooms')}</div>
        <div className="flex justify-between gap-4">
          <div className="flex-1">
            <div className="text-sm text-gray-600">Min</div>
            <select
              className="border rounded px-2 py-1 max-h-40 overflow-y-auto w-full"
              value={filter.bathroomMin}
              onChange={e => setFilter({ ...filter, bathroomMin: e.target.value })}
            >
              <option>Any</option>
              <option>1</option>
              <option>2</option>
              <option>3</option>
            </select>
          </div>
          <div className="flex-1">
            <div className="text-sm text-gray-600">Max</div>
            <select
              className="border rounded px-2 py-1 max-h-40 overflow-y-auto w-full"
              value={filter.bathroomMax}
              onChange={e => setFilter({ ...filter, bathroomMax: e.target.value })}
            >
              <option>Any</option>
              <option>1</option>
              <option>2</option>
              <option>3</option>
            </select>
          </div>
        </div>
      </div>

      {/* Property Type */}
      <div className="mt-4">
        <div className="text-lg text-gray-600 font-bold">{t('property-type')}</div>
        <div className="flex justify-between items-center gap-3 mt-3">
          <select
            className="border rounded px-2 py-1 max-h-40 overflow-y-auto w-full"
            value={filter.propertyType}
            onChange={e => setFilter({ ...filter, propertyType: e.target.value })}
          >
            <option>Any</option>
            <option>House</option>
            <option>Apartment/Unit</option>
          </select>
        </div>
      </div>

      {/* Rate */}
      <div className="mt-4">
        <div className="text-lg text-gray-600 font-bold">{t('rate')}</div>
        <RatingSlider filter={filter} setFilter={setFilter} />
      </div>

      <div className="mt-4">
        <div className="text-lg text-gray-600 font-bold">{t('travel-time')}</div>
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

      {/* Avaliable Date */}
      <div className="pb-4 mt-4">
        <div className="text-lg text-gray-600 font-bold">{t('avaliable-date')}</div>
        <input
          type="date"
          className="border rounded px-2 py-1 mt-2"
          value={filter.avaliableDate}
          onChange={e => setFilter({ ...filter, avaliableDate: e.target.value })}
        />
      </div>
    </>
  );
};

export default HousingFilter;
