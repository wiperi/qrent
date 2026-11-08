import { defaultRentalModelAvailable } from '@/lib/rental-assistant/default-model';
import RentalAssistant from '@/components/RentalAssistant';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return {
    title: locale === 'zh' ? '小 Q 助手 | QRent' : 'Little Q | QRent',
    robots: { index: false, follow: false },
  };
}

export default async function AssistantPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <RentalAssistant
      locale={locale === 'zh' ? 'zh' : 'en'}
      defaultModelAvailable={defaultRentalModelAvailable()}
    />
  );
}
