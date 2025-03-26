'use client';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBookOpen, faFileAlt } from '@fortawesome/free-solid-svg-icons';
import { useTranslations } from 'next-intl';

const HeroButton = () => {
  const t = useTranslations('HeroButton');

  const navItems = [
    {
      href: '/rentalGuide',
      icon: faBookOpen,
      title: t('rental-guide'),
      description: t('rental-guide-des'),
      progress: 7.14, // Progress percentage
      progressText: '2/28',
    },
    {
      href: '/prepareDocuments',
      icon: faFileAlt,
      title: t('application-materials'),
      description: t('application-materials-des'),
      progress: 28.6,
      progressText: '2/7',
    },
  ];

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
                <span className="text-xs text-gray-500">{item.progressText}</span>
              </div>
            </div>
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default HeroButton;
