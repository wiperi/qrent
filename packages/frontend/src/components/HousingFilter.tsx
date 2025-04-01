// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

import React, { useState } from 'react';
import Textbox from './priceDropDown';
import RatingSlider from './Slider';
import { useTranslations } from 'next-intl';
import { useFilterStore } from '../store/useFilterStore';

const SUBURB_OPTIONS = {
  unsw: [
    'Alexandria',
    'Bondi',
    'Botany',
    'Coogee',
    'Eastgardens',
    'Eastlakes',
    'Hillsdale',
    'Kensington',
    'Kingsford',
    'Maroubra',
    'Mascot',
    'Matraville',
    'Paddington',
    'Randwick',
    'Redfern',
    'Rosebery',
    'Waterloo',
    'WolliCreek',
    'Zetland',
  ],
  usyd: [
    'Burwood',
    'Chippendale',
    'City',
    'Glebe',
    'Haymarket',
    'Hurstville',
    'Mascot',
    'Newtown',
    'Ultimo',
    'Waterloo',
    'WolliCreek',
    'Zetland',
  ],
};

const HousingFilter = () => {
  const t = useTranslations('Search');

  const [isAccordionOpen, setAccordionOpen] = useState(true);

  const { filter, updateFilter } = useFilterStore();

  const checkboxOptions = ['Any', ...SUBURB_OPTIONS.unsw, ...SUBURB_OPTIONS.usyd];

  const handleCheckboxChange = area => {
    if (filter.area.includes(area)) {
      // If the area is already selected, remove it
      updateFilter({ area: filter.area.filter(item => item !== area) });
    } else {
      // If the area is not selected, add it
      updateFilter({ area: [...filter.area, area] });
    }
  };

  return (
    <>
      {/* University */}
      <div className="mt-4">
        <div className="text-lg text-gray-600 font-bold">{t('university')}</div>
        <select
          className="border rounded px-2 py-1 max-h-40 overflow-y-auto w-full"
          value={filter.university}
          onChange={e => updateFilter({ ...filter, university: e.target.value })}
        >
          <option>Any</option>
          <option>UNSW</option>
          <option>USYD</option>
        </select>
      </div>

      {/* Price Range */}
      <div className="mt-4">
        <div className="text-lg text-gray-600 font-bold">{t('price-range')}</div>
        <div className="flex justify-between gap-4">
          <div className="flex-1">
            <Textbox
              label=""
              name="priceMin"
              filter={filter}
              updateFilter={updateFilter}
              ph={t('min')}
            />
          </div>
          <div className="flex-1">
            <Textbox
              label=""
              name="priceMax"
              filter={filter}
              updateFilter={updateFilter}
              ph={t('max')}
            />
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="text-lg text-gray-600 font-bold">{t('bedrooms')}</div>
        <div className="flex justify-between gap-4">
          <div className="flex-1">
            <Textbox
              label=""
              name="bedroomMin"
              filter={filter}
              setFilter={updateFilter}
              ph={t('min')}
            />
          </div>
          <div className="flex-1">
            <Textbox
              label=""
              name="bedroomMax"
              filter={filter}
              setFilter={updateFilter}
              ph={t('max')}
            />
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="text-lg text-gray-600 font-bold">{t('bathrooms')}</div>
        <div className="flex justify-between gap-4">
          <div className="flex-1">
            <Textbox
              label=""
              name="bathroomMin"
              filter={filter}
              setFilter={updateFilter}
              ph={t('min')}
            />
          </div>
          <div className="flex-1">
            <Textbox
              label=""
              name="bathroomMax"
              filter={filter}
              setFilter={updateFilter}
              ph={t('max')}
            />
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
            onChange={e => updateFilter({ ...filter, propertyType: e.target.value })}
          >
            <option>Any</option>
            <option>House</option>
            <option>Apartment/Unit</option>
          </select>
        </div>
      </div>

      <div className="mt-4">
        <div
          className="text-lg text-gray-600 font-bold cursor-pointer"
          onClick={() => setAccordionOpen(!isAccordionOpen)}
        >
          Area
        </div>

        {isAccordionOpen && (
          <div className="mt-2 max-h-52 overflow-y-auto  grid grid-cols-2 gap-2">
            {checkboxOptions.map((option, index) => (
              <div key={index} className="flex items-center">
                <input
                  type="checkbox"
                  id={`checkbox-${index}`}
                  value={option}
                  checked={filter.area.includes(option)}
                  onChange={() => handleCheckboxChange(option)}
                  className="mr-2"
                />
                <label htmlFor={`checkbox-${index}`} className="text-gray-600">
                  {option}
                </label>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rate */}
      <div className="mt-4">
        <div className="text-lg text-gray-600 font-bold">{t('rate')}</div>
        <RatingSlider filter={filter} updateFilter={updateFilter} />
      </div>

      <div className="mt-4">
        <div className="text-lg text-gray-600 font-bold">{t('travel-time')}</div>
        <select
          className="border rounded px-2 py-1 max-h-40 overflow-y-auto w-full"
          value={filter.travelTime}
          onChange={e => updateFilter({ ...filter, travelTime: e.target.value })}
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
          onChange={e => updateFilter({ ...filter, avaliableDate: e.target.value })}
        />
      </div>
    </>
  );
};

export default HousingFilter;
