//标题滚动
'use client';
import { useTranslations } from 'next-intl';

const SCHOOLS = ['UNSW', 'USYD', 'UTS'] as const;
type School = typeof SCHOOLS[number];

export default function SchoolRotate() {
  const t = useTranslations('HeroSection');

  return (
    <span className="inline-block relative w-[80px] sm:w-[100px] h-[1.2em] text-center align-middle overflow-hidden">
      {SCHOOLS.map((school: School, index) => (
        <span
          key={school}
          className="absolute left-0 right-0 top-4/9 -translate-y-1/2 animate-school-fade opacity-0 text-center"
          style={{
            animationDelay: `${index * 2}s`,
          }}
        >
          {t(`schools.${school}`)}
        </span>
      ))}
    </span>
  );
}