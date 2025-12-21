'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';

export default function Team() {
  const t = useTranslations('Team');
  const locale = useLocale();

  const team = [
    {
      name: 'Zhiyang Yu',
      role: '',
      bioKey: 'zhiyang',
    },
    {
      name: 'Tianyang(Cliff) Chen',
      role: '',
      bioKey: 'cliff',
    },
    {
      name: 'Yibin(Zack) Zhang',
      role: '',
      bioKey: 'zack',
    },
    {
      name: 'Yuting Bai',
      role: '',
      bioKey: 'yuting',
    },
    {
      name: 'Qixin Yang',
      role: '',
      bioKey: 'qixin',
    },
    {
      name: 'Zhongtao Du',
      role: '',
      bioKey: 'zhongtao',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">{t('title')}</h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {team.map(member => (
            <div
              key={member.name}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6"
            >
              <div className="mb-4">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4 flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">
                    {member.name
                      .split(' ')
                      .map(n => n[0])
                      .join('')}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-slate-900">{member.name}</h3>
              </div>
              <p className="text-slate-600 mb-4 leading-relaxed">{t(`members.${member.bioKey}.bio`)}</p>
              <div className="pt-4 border-t border-slate-100">
                <p className="text-sm text-slate-500">
                  <span className="font-semibold">Expertise:</span> {t(`members.${member.bioKey}.expertise`)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 bg-blue-50 rounded-2xl p-8 border border-blue-100">
          <h2 className="text-2xl font-semibold text-slate-900 mb-4 text-center">{t('joinTeam.title')}</h2>
          <p className="text-slate-600 text-center max-w-2xl mx-auto mb-6">
            {t('joinTeam.description')}
          </p>
          <div className="text-center">
            <Link
              href={`/${locale}/contact`}
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-blue-700 transition-colors"
            >
              {t('joinTeam.getInTouch')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
