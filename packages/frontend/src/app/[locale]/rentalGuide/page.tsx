import CheckList from '@/src/components/CheckList';
import Guides from '@/src/components/Guides';
import { getTranslations } from 'next-intl/server';
import React from 'react';

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations({ locale, namespace: 'RentalGuide' });
  return {
    title: t('checklist-title'),
  };
}

export default async function Page({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations('RentalGuide');
  
  const stepsData = [
    {
      title: `1. ${t('budget-title')}`,
      subtasks: [
        t('budget-subtask-1'),
        t('budget-subtask-2'),
        t('budget-subtask-3'),
        t('budget-subtask-4'),
      ],
    },
    {
      title: `2. ${t('area-title')}`,
      subtasks: [
        t('area-subtask-1'),
        t('area-subtask-2'),
        t('area-subtask-3'),
        t('area-subtask-4'),
      ],
    },
    {
      title: `3. ${t('prepare-title')}`,
      subtasks: [
        t('prepare-subtask-1'),
        t('prepare-subtask-2'),
        t('prepare-subtask-3'),
        t('prepare-subtask-4'),
      ],
    },
    {
      title: `4. ${t('view-title')}`,
      subtasks: [
        t('view-subtask-1'),
        t('view-subtask-2'),
        t('view-subtask-3'),
      ],
    },
    {
      title: `5. ${t('contract-title')}`,
      subtasks: [
        t('contract-subtask-1'),
        t('contract-subtask-2'),
        t('contract-subtask-3'),
      ],
    },
    {
      title: `6. ${t('after-title')}`,
      subtasks: [
        t('after-subtask-1'),
        t('after-subtask-2'),
        t('after-subtask-3'),
      ],
    },
  ];

  return (
    <div className="flex flex-col lg:flex-row">
      {/* Main Content */}
      <div className="flex flex-col lg:flex-row">
        <section className="flex-[2] bg-gray-50 rounded-lg p-5 shadow-md h-[800px] overflow-y-auto">
          <CheckList title={t('checklist-title')} stepsData={stepsData} />
        </section>

        {/* Guides Section */}
        <section className="flex-[8] col-span-2 bg-white shadow-lg rounded-lg p-6 h-[800px]">
          <Guides />
        </section>
      </div>
    </div>
  );
}
