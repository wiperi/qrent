// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

import React, { useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalProps,
  useDisclosure,
} from '@heroui/react';
import RatingSlider from './Slider';
import { useTranslations } from 'next-intl';

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

const MoreFilterModal = ({ filter, setFilter }) => {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [scrollBehavior] = React.useState<ModalProps['scrollBehavior']>('inside');
  const [isAccordionOpen, setAccordionOpen] = useState(true);
  const unswAreaOptions = [...SUBURB_OPTIONS.unsw];
  const usydAreaOptions = [...SUBURB_OPTIONS.usyd];

  const handleCheckboxChange = (option: string) => {
    // If "Any" is selected
    if (option === 'Any') {
      if (filter.area.includes('Any')) {
        // If "Any" is already selected, unselect it
        setFilter({
          ...filter,
          area: [],
        });
      } else {
        // If "Any" is not selected, select only "Any"
        setFilter({
          ...filter,
          area: ['Any'],
        });
      }
    }
    // If another option is selected while "Any" was previously selected
    else if (filter.area.includes('Any')) {
      setFilter({
        ...filter,
        area: [option], // Replace "Any" with the new option
      });
    }
    // Normal toggle behavior for other cases
    else {
      const newArea = filter.area.includes(option)
        ? filter.area.filter(item => item !== option) // Unselect if already selected
        : [...filter.area, option]; // Select if not selected

      setFilter({
        ...filter,
        area: newArea,
      });
    }
  };

  const t = useTranslations('Search');
  return (
    <div className="flex gap-4">
      <button className="text-blue-primary mt-4" onClick={onOpen}>
        {t('more-filters')}
      </button>

      <Modal isOpen={isOpen} scrollBehavior={scrollBehavior} onOpenChange={onOpenChange}>
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
          <ModalContent className="bg-white rounded-lg shadow-lg">
            {onClose => (
              <>
                <ModalHeader className="flex flex-col gap-1">{t('more-filters')}</ModalHeader>
                <ModalBody>
                  {/* Bedrooms */}
                  <div className="border-b pb-4">
                    <div className="text-sm text-gray-600 font-semibold">{t('bedrooms')}</div>
                    <div className="flex justify-between items-center gap-3 mt-3">
                      {/* bedroomMin */}
                      <div className="text-sm text-gray-600">{t('min')}</div>
                      <input
                        type="number"
                        className="border rounded px-2 py-1 max-h-40 overflow-y-auto w-full"
                        value={filter.bedroomMin}
                        onChange={e => setFilter({ ...filter, bedroomMin: e.target.value })}
                      />

                      {/* bedroomMax */}
                      <div className="text-sm text-gray-600">{t('max')}</div>
                      <input
                        type="number"
                        className="border rounded px-2 py-1 max-h-40 overflow-y-auto w-full"
                        value={filter.bedroomMax}
                        onChange={e => setFilter({ ...filter, bedroomMax: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Bathrooms */}
                  <div className="border-b pb-4">
                    <div className="text-sm text-gray-600 font-semibold">{t('bathrooms')}</div>
                    <div className="flex justify-between items-center gap-3 mt-3">
                      {/* bathroomMin */}
                      <div className="text-sm text-gray-600">{t('min')}</div>
                      <input
                        type="number"
                        className="border rounded px-2 py-1 max-h-40 overflow-y-auto w-full"
                        value={filter.bathroomMin}
                        onChange={e => setFilter({ ...filter, bathroomMin: e.target.value })}
                      />
                      {/* bathroomMax */}
                      <div className="text-sm text-gray-600">{t('max')}</div>
                      <input
                        type="number"
                        className="border rounded px-2 py-1 max-h-40 overflow-y-auto w-full"
                        value={filter.bathroomMax}
                        onChange={e => setFilter({ ...filter, bathroomMax: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Property Type */}
                  <div className="border-b pb-4">
                    <div className="text-sm text-gray-600 font-semibold">{t('property-type')}</div>
                    <div className="flex justify-between items-center gap-3 mt-3">
                      <select
                        className="border rounded px-2 py-1 max-h-40 overflow-y-auto w-full"
                        value={filter.propertyType}
                        onChange={e => setFilter({ ...filter, propertyType: e.target.value })}
                      >
                        <option>Any</option>
                        <option>House</option>
                        <option>Apartment/Unit/Flat</option>
                        <option>Studio</option>
                        <option>Semi-detached</option>
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
                      <div className="mt-2 max-h-52 overflow-y-auto grid grid-cols-2 gap-2">
                        {/* "Any" option - always shown */}
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="checkbox-any"
                            value="Any"
                            checked={filter.area.includes('Any')}
                            onChange={() => handleCheckboxChange('Any')}
                            className="mr-2"
                          />
                          <label htmlFor="checkbox-any" className="text-gray-600">
                            Any
                          </label>
                        </div>

                        {/* University-specific options */}
                        {filter.university === 'UNSW' &&
                          unswAreaOptions.map((option, index) => (
                            <div key={index} className="flex items-center">
                              <input
                                type="checkbox"
                                id={`checkbox-${index}`}
                                value={option}
                                checked={filter.area.includes(option)}
                                onChange={() => handleCheckboxChange(option)}
                                className="mr-2"
                                disabled={
                                  filter.area.includes('Any') && !filter.area.includes(option)
                                }
                              />
                              <label
                                htmlFor={`checkbox-${index}`}
                                className={`text-gray-600 ${
                                  filter.area.includes('Any') ? 'opacity-50' : ''
                                }`}
                              >
                                {option}
                              </label>
                            </div>
                          ))}

                        {filter.university === 'USYD' &&
                          usydAreaOptions.map((option, index) => (
                            <div key={index} className="flex items-center">
                              <input
                                type="checkbox"
                                id={`checkbox-${index}`}
                                value={option}
                                checked={filter.area.includes(option)}
                                onChange={() => handleCheckboxChange(option)}
                                className="mr-2"
                                disabled={
                                  filter.area.includes('Any') && !filter.area.includes(option)
                                }
                              />
                              <label
                                htmlFor={`checkbox-${index}`}
                                className={`text-gray-600 ${
                                  filter.area.includes('Any') ? 'opacity-50' : ''
                                }`}
                              >
                                {option}
                              </label>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                  {/* Rate */}
                  <div className="border-b pb-4">
                    <div className="text-sm text-gray-600 font-semibold">{t('rate')}</div>
                    <RatingSlider filter={filter} setFilter={setFilter} />
                  </div>

                  {/* Avaliable Date */}
                  <div className="pb-4">
                    <div className="text-sm text-gray-600 font-semibold">{t('avaliable-date')}</div>
                    <input
                      type="date"
                      className="border rounded px-2 py-1 mt-2"
                      value={filter.avaliableDate}
                      onChange={e => setFilter({ ...filter, avaliableDate: e.target.value })}
                    />
                  </div>
                </ModalBody>
                <ModalFooter>
                  <button className="text-blue-primary font-semibold" onClick={onClose}>
                    {t('save')}
                  </button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </div>
      </Modal>
    </div>
  );
};
export default MoreFilterModal;
