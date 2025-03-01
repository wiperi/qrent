import React from "react";
import image1 from "@/src/components/animata/carousel/mockImg/kate-darmody-bZ3cOBjfQdE-unsplash.jpg";
import image2 from "@/src/components/animata/carousel/mockImg/mykola-kolya-korzh-8jo4TvHtVKM-unsplash.jpg";
import image3 from "@/src/components/animata/carousel/mockImg/chase-yi-0OvXOVkDaKo-unsplash.jpg";
import image4 from "@/src/components/animata/carousel/mockImg/timothy-buck-psrloDbaZc8-unsplash.jpg";

const ImageWithDesctiption = () => {
  return (
    <section className="bg-morandi-grey text-[#111] p-10 rounded-lg">
      <div className="flex flex-col md:flex-row items-center gap-8">
        {/* First Block - Image & Text */}
        <div className="md:w-1/2 w-full relative">
          <img
            src={image1.src}
            alt="Travel Image"
            className="w-auto h-auto object-cover"
          />
        </div>
        <div className="md:w-1/2 w-full text-center md:text-left">
          <h1 className="text-3xl font-serif font-bold text-blue-primary">
            Your Trusted Rental Partner
          </h1>
          <p className="mt-4 text-xl text-morandi-blue font-serif">
            Welcome to Qrent, your trusted partner in finding the perfect home
            away from home in Australia. We specialize in providing
            comprehensive and tailored rental solutions for international
            students, ensuring a seamless and stress-free accommodation
            experience. Our platform connects students with verified properties,
            reliable landlords, and a supportive community, helping them settle
            in with confidence.
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row-reverse items-center gap-8 mt-12">
        {/* Second Block - Image & Text */}
        <div className="md:w-1/2 w-full relative">
          <img src={image2.src} alt="Luggage Image" className="w-auto h-auto" />
        </div>
        <div className="md:w-1/2 w-full text-center md:text-left">
          <h1 className="text-3xl font-serif font-bold text-blue-primary">
            Simplifying Your Rental Experience
          </h1>
          <p className="mt-4 text-xl text-morandi-blue font-serif">
            At Qrent, we understand that moving to a new country can be
            overwhelming, especially when it comes to securing a comfortable and
            safe living space. That’s why we are committed to simplifying the
            rental process, making it more efficient, transparent, and
            convenient. From property listings and virtual tours to lease
            negotiations and local support, we offer a full range of services
            designed to meet the unique needs of students studying abroad.
          </p>
        </div>
      </div>
      <div className="flex flex-col md:flex-row items-center gap-8">
        {/* First Block - Image & Text */}
        <div className="md:w-1/2 w-full relative">
          <img src={image4.src} alt="Travel Image" className="w-auto h-auto" />
        </div>
        <div className="md:w-1/2 w-full text-center md:text-left">
          <h1 className="text-3xl font-serif font-bold text-blue-primary">
            More Than Just a Rental Service
          </h1>
          <p className="mt-4 text-xl text-morandi-blue font-serif">
            With Qrent, you’re not just renting a property—you’re gaining a
            secure and welcoming starting point for your journey in Australia.
            Whether you need assistance with finding the right neighborhood,
            understanding rental agreements, or handling maintenance issues, our
            dedicated team is here to guide you every step of the way. We strive
            to provide personalized support so you can focus on what truly
            matters—your studies and your new experiences.
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row-reverse items-center gap-8 mt-12">
        {/* Second Block - Image & Text */}
        <div className="md:w-1/2 w-full relative">
          <img src={image3.src} alt="Luggage Image" className="w-auto h-auto" />
        </div>
        <div className="md:w-1/2 w-full text-center md:text-left">
          <h1 className="text-3xl font-serif font-bold text-blue-primary">
            Start Your Journey with Confidence
          </h1>
          <p className="mt-4 text-xl text-morandi-blue font-serif">
            At Qrent, we believe that a comfortable and secure living space is
            the foundation of a successful student experience. Let us help you
            find a place where you feel at home. Start your rental journey with
            Qrent today!
          </p>
        </div>
      </div>
    </section>
  );
};

export default ImageWithDesctiption;
