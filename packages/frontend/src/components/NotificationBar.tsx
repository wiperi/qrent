import { useTranslations } from 'next-intl';
import { HiInformationCircle } from 'react-icons/hi';

export default function NotificationBar() {
  const t = useTranslations('NotificationBar');
  return (
    <aside className="mb-2 sm:mb-3" aria-label={t('label')}>
      <div className="max-w-7xl mx-auto px-5">
        <div className="flex items-center justify-center py-3 px-4 sm:px-6 gap-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl">
          <HiInformationCircle className="flex-shrink-0 w-5 h-5" aria-hidden="true" />
          <p className="text-sm text-center leading-relaxed">{t('message')}</p>
        </div>
      </div>
    </aside>
  );
}
