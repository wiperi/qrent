import Link from "next/link";
import React from "react";

const page = () => {
  return (
    <main>
      <section className="flex flex-col justify-center items-center py-16">
        <h1 className="text-5xl font-bold font-serif text-center text-blue-primary mb-4">
          Contact Us
        </h1>
        <p className="text-xl text-center font-serif text-gray-700 max-w-2xl">
          Have questions or need support? Reach out to us—we’re happy to help!
          We’ll get back to you as soon as possible.
        </p>
      </section>
      <div className="text-center space-y-4">
        <p className="text-xl font-medium font-serif">
          Email: yyzyfish5@gmail.com
        </p>
        <p className="text-xl font-medium font-serif">
          Social:
          <Link
            href="https://www.xiaohongshu.com/user/profile/609ca560000000000101fd15"
            className="text-blue-primary hover:underline ml-1"
          >
            RedNote
          </Link>
        </p>
        <p className="text-xl text-gray-500 font-serif">
          Ask us about our services, collaborations, or any inquiries you have!
        </p>
      </div>
    </main>
  );
};

export default page;
