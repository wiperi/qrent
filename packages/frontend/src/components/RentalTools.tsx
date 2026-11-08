import RentalBetaSignup from './RentalBetaSignup';
import { RentalAssistantTrigger } from './RentalAssistantLauncher';

export default function RentalTools({ locale, className }: { locale: string; className?: string }) {
  return (
    <div className={className}>
      <RentalBetaSignup
        locale={locale}
        assistantAction={<RentalAssistantTrigger locale={locale} />}
      />
    </div>
  );
}
