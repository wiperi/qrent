'use client';

import { useTranslations } from 'next-intl';

export default function About() {
  const t = useTranslations('About');

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-8">{t('title')}</h1>

        <div className="prose prose-slate max-w-none">
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">{t('mission.title')}</h2>
            <p className="text-lg text-slate-600 leading-relaxed mb-4">
              {t('mission.description1')}
            </p>
            <p className="text-lg text-slate-600 leading-relaxed">
              {t('mission.description2')}
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">{t('whatWeDo.title')}</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <h3 className="text-xl font-semibold text-slate-900 mb-3">{t('whatWeDo.smartAggregation.title')}</h3>
                <p className="text-slate-600">
                  {t('whatWeDo.smartAggregation.description')}
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <h3 className="text-xl font-semibold text-slate-900 mb-3">{t('whatWeDo.intelligentScoring.title')}</h3>
                <p className="text-slate-600">
                  {t('whatWeDo.intelligentScoring.description')}
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <h3 className="text-xl font-semibold text-slate-900 mb-3">{t('whatWeDo.realTimeUpdates.title')}</h3>
                <p className="text-slate-600">
                  {t('whatWeDo.realTimeUpdates.description')}
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <h3 className="text-xl font-semibold text-slate-900 mb-3">{t('whatWeDo.personalizedExperience.title')}</h3>
                <p className="text-slate-600">
                  {t('whatWeDo.personalizedExperience.description')}
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">{t('ourStory.title')}</h2>
            <p className="text-lg text-slate-600 leading-relaxed mb-4">
              {t('ourStory.description1')}
            </p>
            <p className="text-lg text-slate-600 leading-relaxed">
              {t('ourStory.description2')}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
