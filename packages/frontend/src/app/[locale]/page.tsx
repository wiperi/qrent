'use client';
import Search from '@/src/components/Search';
import HeroButton from '@/src/components/HeroButton';
import JustLanded from '@/src/components/JustLanded';

export default function HomePage() {
  return (
    <main>
      <Search />
      <HeroButton />
      <JustLanded />
    </main>
  );
}
