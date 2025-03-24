'use client';

import Hero from '../components/Hero';
import HeroButton from '../components/HeroButton';
import JustForYou from '../components/JustForYou';
import JustLanded from '../components/JustLanded';
import Search from '../components/Search';

export default function Home() {
  return (
    <main>
      {/* <Hero /> */}
      <Search />
      <HeroButton />
      <JustLanded />
      {/* <JustForYou /> */}
    </main>
  );
}
