"use client";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBookOpen, faFileAlt } from "@fortawesome/free-solid-svg-icons";

const navItems = [
  {
    href: "/rentalGuide",
    icon: faBookOpen,
    title: "Rental Guide",
    description: "All the rental information you need",
    progress: 7.14, // Progress percentage
    progressText: "2/28",
  },
  {
    href: "/prepareDocuments",
    icon: faFileAlt,
    title: "Application Materials",
    description: "Preparation and generation of all materials",
    progress: 28.6,
    progressText: "2/7",
  },
];

const HeroButton = () => {
  return (
    <div className="max-w-screen-lg mx-auto mt-8 px-6">
      <nav className="flex flex-wrap gap-6">
        {navItems.map((item, index) => (
          <Link
            key={index}
            href={item.href}
            className="flex-1 min-w-[250px] bg-white p-6 rounded-lg shadow-md flex items-center gap-4 hover:shadow-lg transition"
          >
            {/* Icon */}
            <div className="text-4xl text-blue-primary">
              <FontAwesomeIcon icon={item.icon} />
            </div>

            {/* Text Content */}
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{item.title}</h3>
              <p className="text-sm text-gray-600">{item.description}</p>

              {/* Progress Indicator */}
              <div className="mt-2">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-primary"
                    style={{ width: `${item.progress}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-500">
                  {item.progressText}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default HeroButton;
