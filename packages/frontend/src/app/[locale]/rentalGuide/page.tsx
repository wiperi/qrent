import CheckList from '@/src/components/CheckList';
import Guides from '@/src/components/Guides';
import { useTranslations } from 'next-intl';
import React from 'react';

const Page = () => {
  const t = useTranslations('RentalGuide');
  return (
    <div className="flex flex-col lg:flex-row">
      {/* Main Content */}

      <div className="flex flex-col lg:flex-row">
        <section className="flex-[2] bg-gray-50 rounded-lg p-5 shadow-md h-[700px] overflow-y-auto">
          <CheckList title={t('rental-process')} />
        </section>

        {/* Guides Section */}
        <section className="flex-[8] col-span-2 bg-white shadow-lg rounded-lg p-6 h-[700px]">
          <Guides />
        </section>
      </div>
    </div>
  );
};

export default Page;
