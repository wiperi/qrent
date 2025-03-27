import React from 'react';
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

const MoreFilterModal = ({ filter, setFilter }) => {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [scrollBehavior, setScrollBehavior] =
    React.useState<ModalProps['scrollBehavior']>('inside');
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

                      {/* bedroomMax */}
                      <div className="text-sm text-gray-600">{t('max')}</div>
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

                  {/* Bathrooms */}
                  <div className="border-b pb-4">
                    <div className="text-sm text-gray-600 font-semibold">{t('bathrooms')}</div>
                    <div className="flex justify-between items-center gap-3 mt-3">
                      {/* bathroomMin */}
                      <div className="text-sm text-gray-600">{t('min')}</div>
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

                      {/* bathroomMax */}
                      <div className="text-sm text-gray-600">{t('max')}</div>
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
                        <option>Apartment/Unit</option>
                      </select>
                    </div>
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
