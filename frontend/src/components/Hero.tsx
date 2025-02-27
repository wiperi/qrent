import React from "react";
import Container from "./Container";
import AnimatedGradientText from "./animata/text/animated-gradient-text";

const Hero = () => {
  return (
    <section
      id="Home"
      className="overflow-hidden py-20 sm:py-32 lg:py-32 xl:pb-3"
    >
      <Container className="font-serif text-center">
        <AnimatedGradientText className="text-7xl">
          Find Your Dream Home
        </AnimatedGradientText>
      </Container>
    </section>
  );
};

export default Hero;
