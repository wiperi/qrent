import { notFound } from 'next/navigation';
import RentalLetterWorkspace from '@/components/RentalLetterWorkspace';

type Props = { params: Promise<{ locale: string; type: string }> };

export function generateStaticParams() {
  return [{ type: 'cover' }, { type: 'parent' }];
}

export async function generateMetadata({ params }: Props) {
  const { locale, type } = await params;
  if (type !== 'cover' && type !== 'parent') notFound();
  const titles =
    type === 'cover'
      ? ['租房申请信', 'Rental cover letter']
      : ['父母资助信', 'Parent support letter'];
  return {
    title: titles[locale === 'zh' ? 0 : 1] + ' | Qrent',
    robots: { index: false, follow: true },
  };
}

export default async function LetterPage({ params }: Props) {
  const { locale, type } = await params;
  if (type !== 'cover' && type !== 'parent') notFound();
  return (
    <RentalLetterWorkspace
      key={type + ':' + locale}
      type={type}
      locale={locale === 'zh' ? 'zh' : 'en'}
    />
  );
}
