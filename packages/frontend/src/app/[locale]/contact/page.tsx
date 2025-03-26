import { useTranslations } from 'next-intl';
import Link from 'next/link';
import React from 'react';

const page = () => {
  const t = useTranslations('Contact');
  return (
    <main>
      <section className="flex flex-col justify-center items-center py-16">
        <h1 className="text-5xl font-bold font-sans text-center text-blue-primary mb-4">
          {t('header')}
        </h1>
        <p className="text-xl text-center font-sans text-gray-500 max-w-2xl">{t('c1')}</p>
      </section>
      <div className="text-center space-y-4 mb-4">
        <p className="text-xl font-medium font-sans">{t('email')}</p>
        <p className="text-xl font-medium font-sans">
          {t('social')}
          <Link
            href="https://www.xiaohongshu.com/user/profile/609ca560000000000101fd15"
            className="text-blue-primary hover:underline ml-1"
          >
            {t('rednote')}
          </Link>
        </p>
        <p className="text-xl text-gray-500 font-sans">{t('end')}</p>
      </div>
    </main>
  );
};

export default page;
