'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { MdEmail, MdLocationOn } from 'react-icons/md';
import { SiGithub, SiXiaohongshu } from 'react-icons/si';

export default function Contact() {
  const t = useTranslations('Contact');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would typically send the form data to your backend
    console.log('Form submitted:', formData);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: '', email: '', subject: '', message: '' });
    }, 3000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">{t('title')}</h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-6">{t('form.title')}</h2>

            {submitted ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <div className="text-green-600 text-5xl mb-4">✓</div>
                <h3 className="text-xl font-semibold text-green-900 mb-2">{t('form.successTitle')}</h3>
                <p className="text-green-700">{t('form.successMessage')}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                    {t('form.name')}
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder={t('form.namePlaceholder')}
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                    {t('form.email')}
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder={t('form.emailPlaceholder')}
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-slate-700 mb-2">
                    {t('form.subject')}
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder={t('form.subjectPlaceholder')}
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-2">
                    {t('form.message')}
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-none"
                    placeholder={t('form.messagePlaceholder')}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  {t('form.submitButton')}
                </button>
              </form>
            )}
          </div>

          {/* Contact Information */}
          <div className="space-y-8">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
              <h2 className="text-2xl font-semibold text-slate-900 mb-6">{t('contactInfo.title')}</h2>

              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <MdEmail className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">{t('contactInfo.email')}</h3>
                    <a href="mailto:yyzyfish5@gmail.com" className="text-slate-600 hover:text-blue-600 transition-colors">
                      yyzyfish5@gmail.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <MdLocationOn className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">{t('contactInfo.office')}</h3>
                    <p className="text-slate-600" dangerouslySetInnerHTML={{ __html: t('contactInfo.officeAddress') }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
              <h2 className="text-2xl font-semibold text-slate-900 mb-6">{t('followUs.title')}</h2>
              <div className="flex gap-4">
                <a
                  href="https://www.xiaohongshu.com/user/profile/63f617c9000000000f011eb7"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Xiaohongshu"
                  className="flex items-center justify-center w-14 h-14 rounded-full border-2 border-slate-200 text-slate-700 hover:text-white hover:bg-red-500 hover:border-red-500 transition"
                >
                  <SiXiaohongshu className="w-6 h-6" />
                </a>
                <a
                  href="https://github.com/wiperi/qrent"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub"
                  className="flex items-center justify-center w-14 h-14 rounded-full border-2 border-slate-200 text-slate-700 hover:text-white hover:bg-slate-900 hover:border-slate-900 transition"
                >
                  <SiGithub className="w-6 h-6" />
                </a>
              </div>
            </div>

            <div className="bg-blue-50 rounded-2xl border border-blue-100 p-8">
              <h3 className="text-xl font-semibold text-slate-900 mb-3">{t('officeHours.title')}</h3>
              <div className="space-y-2 text-slate-600">
                <p><span className="font-medium">{t('officeHours.weekdays')}</span> {t('officeHours.weekdaysTime')}</p>
                <p><span className="font-medium">{t('officeHours.saturday')}</span> {t('officeHours.saturdayTime')}</p>
                <p><span className="font-medium">{t('officeHours.sunday')}</span> {t('officeHours.sundayTime')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
