// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

import { useTranslations } from 'next-intl';
import React from 'react';
import { FaBath, FaBed, FaMapMarkerAlt } from 'react-icons/fa';
// interface House {
//   Price?: number;
//   'Average Score'?: number;
//   Address?: string;
//   Bedrooms?: number;
//   Bathrooms?: number;
//   Keywords: string[];
//   'Address Line 1'?: string;
//   'Address Line 2'?: string;
//   'House Type'?: string;
//   'Number of Bedrooms'?: number;
//   'Number of Bathrooms'?: number;
//   update_time?: string; // assuming update_time is a string (ISO 8601 format or similar)
//   website?: string; // assuming website is a string (URL)
// }

interface HouseCardProps {
  house: House;
}

const JustLandedHouseCard: React.FC<HouseCardProps> = ({ house }) => {
  const t = useTranslations('HouseCard');
  const price = house.PricePerWeek || 0;
  const scoreValue = house.averageScore;

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

  const isToday =
    house.update_time && new Date(house.update_time).toDateString() === new Date().toDateString();

  let keywordsHtml = '';
  if (house['Keywords']) {
    let keywordsArray: string | string[] = house['Keywords'];
    // Check if the keywords are a string
    if (typeof keywordsArray === 'string') {
      // Split based on common English delimiters like commas, spaces, or periods
      if (keywordsArray.includes(',')) {
        keywordsArray = keywordsArray.split(',');
      } else if (keywordsArray.includes(' ')) {
        keywordsArray = keywordsArray.split(' ');
      } else {
        keywordsArray = [keywordsArray]; // Treat the whole string as one keyword if no delimiter is found
      }
    }

    if (Array.isArray(keywordsArray)) {
      const topKeywords = keywordsArray.filter(k => k && k.trim() !== '').map(k => k.trim());

      if (topKeywords.length > 0) {
        keywordsHtml = `
          <div class="mt-2 border-t-2 border-gray-100 p-1">
            ${topKeywords
              .map(kw => `<span class="inline-block text-gray-700 text-xs mr-2">${kw}</span>`)
              .join('')}
          </div>
        `;
      }
    }
  }

  return (
    <a
      href={house.website}
      target="_blank"
      rel="noopener noreferrer"
      className="block border border-gray-300 rounded-lg shadow-lg hover:shadow-2xl transition duration-300 p-6 bg-white hover:bg-gray-50 relative"
    >
      {isToday && (
        <div className="bg-green-200 text-green-700 text-xs font-semibold rounded-full px-2 py-1 absolute top-2 right-2">
          Updated Today
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-xl font-semibold text-gray-800">
          {house['Address Line 1'] || 'Unknown Address'}
        </h3>
        <div className="flex items-center space-x-1 mt-2 mb-4">
          <FaMapMarkerAlt className="text-gray-700 text-sm" />
          <span className="text-sm text-gray-500">
            {house['Address Line 2'] || 'Unknown Location'}
          </span>
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
        {house['Number of Bedrooms'] && (
          <div className="flex items-center space-x-1 bg-gray-100 text-blue-primary px-3 py-1 rounded-sm">
            <FaBed className="text-blue-primary" />
            <span className="text-sm ">{house['Number of Bedrooms']}</span>
          </div>
        )}
        {house['Number of Bathrooms'] && (
          <div className="flex items-center space-x-1 bg-gray-100 text-blue-primary px-3 py-1 rounded-sm">
            <FaBath className="text-blue-primary" />
            <span className="text-sm ">{house['Number of Bathrooms']}</span>
          </div>
        )}
        {house['House Type'] && (
          <div className="flex items-center space-x-1 bg-gray-100 text-blue-primary px-3 py-1 rounded-sm">
            <span className="inline-block bg-gray-100 text-gray-800 rounded-full text-xs">
              {house['House Type']}
            </span>
          </div>
        )}
      </div>

      {keywordsHtml && (
        <div className="mt-4" dangerouslySetInnerHTML={{ __html: keywordsHtml }}></div>
      )}
    </a>
  );
};

export default JustLandedHouseCard;
