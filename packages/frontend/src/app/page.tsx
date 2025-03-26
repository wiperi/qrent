'use client';

import HeroButton from '../components/HeroButton';
import JustLanded from '../components/JustLanded';
import Search from '../components/Search';

export default function Home() {
  return (
    <main>
      <Search />
      <HeroButton />
      <JustLanded />
    </main>
  );
}
