import CheckListWithoutSubTask from '@/src/components/CheckListWithoutSubTask';
import DocumentPreview from '@/src/components/DocumentPreview';
import LetterForm from '@/src/components/LetterForm';
import { useTranslations } from 'next-intl';

export default function Page() {
  const t = useTranslations('PrepareDocuments');

  const rentalChecklist = [
    t('passport'),
    'COE',
    t('visa'),
    t('financial-statement'),
    'Cover Letter',
    'Parent Letter',
    t('recommendation-letter'),
  ];

  return (
    <div className="min-h-auto">
      <div className="flex flex-col lg:flex-row">
        {/* CheckList */}
        <section className="flex-[2] bg-gray-50 rounded-lg p-5 shadow-md h-auto overflow-y-auto">
          <CheckListWithoutSubTask title={t('rental-checklist')} items={rentalChecklist} />
        </section>

        {/* coverletter / parent letter form */}
        <section className="flex-[5] col-span-2 bg-white shadow-lg rounded-lg p-6">
          <LetterForm />
        </section>

        {/* Document Preview */}
        <section className="flex-[3] col-span-2 bg-white shadow-lg rounded-lg p-6">
          <DocumentPreview />
        </section>
      </div>
    </div>
  );
}
