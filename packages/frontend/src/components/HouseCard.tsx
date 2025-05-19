// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import React from 'react';
import { FaBath, FaBed, FaCalendarAlt, FaCar, FaMapMarkerAlt, FaRegClock } from 'react-icons/fa';

const JustLandedHouseCard = ({ house }) => {
  let locale = '';
  if (usePathname().startsWith('/en')) {
    locale = 'en';
  } else {
    locale = 'zh';
  }

  const t = useTranslations('HouseCard');
  const price = house.pricePerWeek;
  const scoreValue = house.averageScore.toFixed(1);
  if (house.addressLine1 == null) {
    house.addressLine1 = '';
  }
  if (house.addressLine2 == null) {
    house.addressLine2 = '';
  }
  house.addressLine1 = house.addressLine1
    .replaceAll('-', ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  house.addressLine2 = house.addressLine2
    .replaceAll('-', ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  let scoreClass = '';
  const point = t('points');

  let scoreText = `${scoreValue} ${point}`;

  const top = t('top');
  const good = t('good');

  // Adjusted text for top-rated houses
  if (scoreValue !== 'N/A') {
    const numScore = Number(scoreValue);
    if (numScore >= 18.3) {
      scoreClass = 'bg-orange-500 text-white shadow-md shadow-orange-400';
      scoreText = `${top} ${scoreText}`; // Shortened text
    } else if (numScore >= 18.0) {
      scoreClass = 'bg-orange-400 text-white shadow-md shadow-orange-400';
      scoreText = `${good} ${scoreText}`; // Shortened text
    } else {
      scoreClass = 'border border-blue-primary text-blue-primary bg-white';
      scoreText = `${scoreText}`; // Shortened text
    }
  }
  house.publishedAt = house.publishedAt.split('T')[0];

  if (house.availableDate != null) {
    house.availableDate = house.availableDate.split('T')[0];
  }

  if (house.keywords == null) {
    house.keywords = '';
  }

  if (house.descriptionCN == null) {
    house.descriptionCN = '';
  }

  let description = '';
  if (locale == 'en') {
    if (house.keywords == null) {
      description = house.description.split(',');
    } else {
      description = house.keywords.split(',');
    }
  } else {
    description = house.descriptionCN.split(',');
  }

  let propertyType = '';
  if (house.propertyType == 1) {
    propertyType = 'House';
  } else if (house.propertyType == 2) {
    propertyType = 'Apartment/Unit/Flat';
  } else if (house.propertyType == 3) {
    propertyType = 'Studio';
  } else if (house.propertyType == 4) {
    propertyType = 'Semi-detached';
  }

  return (
    <a
      href={house.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block border border-gray-300 rounded-lg shadow-lg hover:shadow-2xl transition duration-300 p-6 bg-white hover:bg-gray-50 relative"
    >
      <div className="mb-4">
        <div className="flex space-x-4">
          <h3 className="text-xl font-semibold text-gray-800">
            {house.addressLine1 || 'Unknown Address'}
          </h3>
          {propertyType != '' && (
            <div className="flex items-center space-x-1 bg-gray-100 text-blue-primary px-3 py-1 rounded-sm">
              <span className="inline-block rounded-full text-md">{propertyType}</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-1 mt-2 mb-4">
          <FaMapMarkerAlt className="text-gray-700 text-sm" />
          <span className="text-sm text-gray-500">{house.addressLine2 || 'Unknown Location'}</span>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <span className="text-2xl font-semibold text-blue-primary">
          {`$${price}`}{' '}
          <span className="text-xs font-normal text-gray-600 whitespace-nowrap">/week</span>
        </span>
      </div>

      <span className={`text-md ${scoreClass} rounded-full px-2 py-1 absolute top-4 right-4`}>
        {scoreText}
      </span>

      <div className="flex space-x-4 mt-4">
        {house.bedroomCount != 0 && (
          <div className="flex items-center space-x-1 bg-gray-100 text-blue-primary px-3 py-1 rounded-sm">
            <FaBed className="text-blue-primary" />
            <span className="text-sm ">{house.bedroomCount}</span>
          </div>
        )}

        {house.bathroomCount != 0 && (
          <div className="flex items-center space-x-1 bg-gray-100 text-blue-primary px-3 py-1 rounded-sm">
            <FaBath className="text-blue-primary" />
            <span className="text-sm ">{house.bathroomCount}</span>
          </div>
        )}

        {house.commuteTime != 0 && (
          <div className="flex items-center space-x-1 bg-gray-100 text-blue-primary px-3 py-1 rounded-sm">
            <FaRegClock className="text-blue-primary" />
            <span className="text-sm">{house.commuteTime}</span>
          </div>
        )}

        <div className="flex items-center space-x-1 bg-gray-100 text-blue-primary px-3 py-1 rounded-sm">
          <FaCalendarAlt className="text-blue-primary" />
          <span className="text-sm">{house.availableDate || 'Unknown'}</span>
        </div>

        {house.parkingCount != null && (
          <div className="flex items-center space-x-1 bg-gray-100 text-blue-primary px-3 py-1 rounded-sm">
            <FaCar className="text-blue-primary" />
            <span className="text-sm">{house.parkingCount}</span>
          </div>
        )}
      </div>

      <div className="mt-4">
        <div className="mt-2">
          {description.map((kw, index) => (
            <span
              key={index} // always use a unique key if you map through an array
              className="inline-block bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs mr-2"
            >
              {kw}
            </span>
          ))}
        </div>
      </div>
    </a>
  );
};

export default JustLandedHouseCard;
