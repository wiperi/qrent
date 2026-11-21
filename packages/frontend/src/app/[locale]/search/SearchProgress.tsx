import { useTranslations } from 'next-intl';

export default function SearchProgress({ active = true }: { active?: boolean }) {
  const t = useTranslations('SearchResults');

  return (
    <div role="status">
      {active && (
        <p className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-700">
          <span
            aria-hidden="true"
            className="h-4 w-4 shrink-0 rounded-full border-2 border-blue-600 border-r-transparent motion-safe:animate-spin"
          />
          {t('searching')}
        </p>
      )}
    </div>
  );
}
