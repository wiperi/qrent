'use client';
import React from 'react';
import image1 from '@/src/components/animata/carousel/mockImg/kate-darmody-bZ3cOBjfQdE-unsplash.jpg';
import image2 from '@/src/components/animata/carousel/mockImg/mykola-kolya-korzh-8jo4TvHtVKM-unsplash.jpg';
import image3 from '@/src/components/animata/carousel/mockImg/chase-yi-0OvXOVkDaKo-unsplash.jpg';
import image4 from '@/src/components/animata/carousel/mockImg/timothy-buck-psrloDbaZc8-unsplash.jpg';
import { useTranslations } from 'next-intl';

export default async function ImageWithDesctiption() {
  const t = useTranslations('About');
  return (
    <section className="bg-morandi-grey text-[#111] p-10 rounded-lg">
      <div className="flex flex-col md:flex-row items-center gap-8">
        {/* First Block - Image & Text */}
        <div className="md:w-1/2 w-full relative">
          <img src={image1.src} alt="Travel Image" className="w-auto h-auto object-cover" />
        </div>
        <div className="md:w-1/2 w-full text-center md:text-left">
          <h1 className="text-3xl font-serif font-bold text-blue-primary">{t('h1')}</h1>
          <p className="mt-4 text-xl text-morandi-blue font-serif">{t('c1')}</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row-reverse items-center gap-8 mt-12">
        {/* Second Block - Image & Text */}
        <div className="md:w-1/2 w-full relative">
          <img src={image2.src} alt="Luggage Image" className="w-auto h-auto" />
        </div>
        <div className="md:w-1/2 w-full text-center md:text-left">
          <h1 className="text-3xl font-serif font-bold text-blue-primary">{t('h2')}</h1>
          <p className="mt-4 text-xl text-morandi-blue font-serif">{t('c2')}</p>
        </div>
      </div>
      <div className="flex flex-col md:flex-row items-center gap-8">
        {/* First Block - Image & Text */}
        <div className="md:w-1/2 w-full relative">
          <img src={image4.src} alt="Travel Image" className="w-auto h-auto" />
        </div>
        <div className="md:w-1/2 w-full text-center md:text-left">
          <h1 className="text-3xl font-serif font-bold text-blue-primary">{t('h3')}</h1>
          <p className="mt-4 text-xl text-morandi-blue font-serif">{t('c3')}</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row-reverse items-center gap-8 mt-12">
        {/* Second Block - Image & Text */}
        <div className="md:w-1/2 w-full relative">
          <img src={image3.src} alt="Luggage Image" className="w-auto h-auto" />
        </div>
        <div className="md:w-1/2 w-full text-center md:text-left">
          <h1 className="text-3xl font-serif font-bold text-blue-primary">{t('h4')}</h1>
          <p className="mt-4 text-xl text-morandi-blue font-serif">{t('c4')}</p>
        </div>
      </div>
    </section>
  );
}
