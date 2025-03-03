import CheckList from "@/src/components/CheckList";
import React from "react";

const guidesData = [
  {
    title: "Complete Guide to Australian Rental Types",
    desc: "Detailed comparison of different rental options to help you find the best choice.",
    image: "https://picsum.photos/400/300",
    author: "Rental Expert",
    avatar: "https://picsum.photos/50/50",
    date: "2024-02-20",
    category: "Rental Types",
  },
  {
    title: "Sydney Area Guide: Complete Guide to Choosing the Right Location",
    desc: "In-depth analysis of Sydney areas, including transport, facilities, and safety aspects.",
    image: "https://picsum.photos/400/300",
    author: "Area Expert",
    avatar: "https://picsum.photos/50/50",
    date: "2024-02-21",
    category: "Area Selection",
  },
];

const page = () => {
  return (
    <div className="min-h-auto font-serif">
      {/* Main Content */}

      <div className="flex flex-col lg:flex-row">
        <section className="flex-[3] bg-gray-50 rounded-lg p-5 shadow-md h-auto overflow-y-auto">
          <CheckList />
        </section>

        {/* Guides Section */}
        <section className="flex-[7] col-span-2 bg-white shadow-lg rounded-lg p-6">
          <div className="flex justify-between mb-6 ">
            <div className="flex flex-wrap gap-4">
              <span className="bg-blue-primary text-white px-4 py-1 rounded-full text-sm">
                All
              </span>
              <span className="bg-gray-200 text-gray-600 px-4 py-1 rounded-full text-sm cursor-pointer hover:bg-blue-primary hover:text-white">
                Rental types
              </span>
              <span className="bg-gray-200 text-gray-600 px-4 py-1 rounded-full text-sm cursor-pointer hover:bg-blue-primary hover:text-white">
                Areas
              </span>
              <span className="bg-gray-200 text-gray-600 px-4 py-1 rounded-full text-sm cursor-pointer hover:bg-blue-primary hover:text-white">
                Buget
              </span>
              <span className="bg-gray-200 text-gray-600 px-4 py-1 rounded-full text-sm cursor-pointer hover:bg-blue-primary hover:text-white">
                Application
              </span>
              <span className="bg-gray-200 text-gray-600 px-4 py-1 rounded-full text-sm cursor-pointer hover:bg-blue-primary hover:text-white">
                Viewing Tips
              </span>
              <span className="bg-gray-200 text-gray-600 px-4 py-1 rounded-full text-sm cursor-pointer hover:bg-blue-primary hover:text-white">
                Signing the lease
              </span>
              <span className="bg-gray-200 text-gray-600 px-4 py-1 rounded-full text-sm cursor-pointer hover:bg-blue-primary hover:text-white">
                Move-in & Setting
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {guidesData.map((guide, index) => (
              <div
                key={index}
                className="bg-white shadow-md rounded-lg overflow-hidden"
              >
                <div className="h-48 bg-gray-300">
                  <img
                    src={guide.image}
                    alt={guide.title}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-semibold">{guide.title}</h3>
                  <p className="text-sm text-gray-500 mt-2">{guide.desc}</p>
                  <div className="flex justify-between items-center mt-4">
                    <div className="flex items-center">
                      <img
                        src={guide.avatar}
                        alt={guide.author}
                        className="w-6 h-6 rounded-full"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        {guide.author}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">{guide.date}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default page;
