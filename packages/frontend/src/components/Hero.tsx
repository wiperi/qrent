import React from 'react';
import Container from './Container';
import TextFlip from './animata/text/text-flip';

const Hero = () => {
  return (
    <section id="Home" className="overflow-hidden py-10 sm:py-15 lg:py-15 xl:pb-3">
      <Container className="font-serif text-center">
        <TextFlip />
      </Container>
    </section>
  );
};

export default Hero;
