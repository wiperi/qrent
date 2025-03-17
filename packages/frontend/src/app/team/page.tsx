import { ExpandableCardDemo } from "@/src/components/TeamsIntro";
import React from "react";

const Join = () => {
  return (
    <main>
      <section className="flex flex-col justify-center items-center py-16">
        <h1 className="text-5xl font-bold font-serif text-center text-blue-primary mb-4">
          Meet The Team
        </h1>
        <p className="text-xl text-center font-serif text-gray-700 max-w-2xl">
          We are a group of UNSW students passionate about building innovative
          solutions. Our team includes the founder, one frontend developer, and
          two backend developers, all working together to create something
          special.
        </p>
      </section>
      <ExpandableCardDemo />
    </main>
  );
};

export default Join;
