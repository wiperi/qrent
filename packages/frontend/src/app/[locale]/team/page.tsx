import { ExpandableCardDemo } from '@/src/components/TeamsIntro';
import { useTranslations } from 'next-intl';
import React from 'react';

const Join = () => {
  const t = useTranslations('Team');
  return (
    <main>
      <section className="flex flex-col justify-center items-center py-16">
        <h1 className="text-5xl font-bold font-sans text-center text-blue-primary mb-4">
          {t('header')}
        </h1>
        <p className="text-xl text-center font-sans text-gray-700 max-w-2xl">{t('des')}</p>
      </section>
      <ExpandableCardDemo />
    </main>
  );
};

export default Join;
