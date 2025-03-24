import React from 'react';
import { FaBath, FaBed, FaMapMarkerAlt } from 'react-icons/fa';

const HouseCard = ({ house }) => {
  const price = house.Price || 0;
  const scoreValue =
    house['Average Score'] !== null && house['Average Score'] !== undefined
      ? Number(house['Average Score']).toFixed(1)
      : 'N/A';

  let scoreClass = '';
  let scoreText = `${scoreValue} Points`;

  // Adjusted text for top-rated houses
  if (scoreValue !== 'N/A') {
    const numScore = Number(scoreValue);
    if (numScore >= 18.3) {
      scoreClass = 'bg-orange-500 text-white shadow-md shadow-orange-400';
      scoreText = `TOP / ${scoreText}`; // Shortened text
    } else if (numScore >= 18.0) {
      scoreClass = 'bg-orange-400 text-white shadow-md shadow-orange-400';
      scoreText = `GOOD / ${scoreText}`; // Shortened text
    } else {
      scoreClass = 'border border-blue-primary text-blue-primary bg-white';
      scoreText = `${scoreText}`; // Shortened text
    }
  }

  const isToday = new Date(house.update_time).toDateString() === new Date().toDateString();

  let keywordsHtml = '';
  if (house['Keywords']) {
    let keywordsArray = house['Keywords'];
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
      const topKeywords = keywordsArray
        .filter(k => k && k.trim() !== '')
        .map(k => k.trim())
        .slice(0, 3);

      if (topKeywords.length > 0) {
        keywordsHtml = `
          <div class="mt-2">
            ${topKeywords
              .map(
                kw =>
                  `<span class="inline-block bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs mr-2">${kw}</span>`
              )
              .join('')}
            ${
              keywordsArray.length > 3
                ? `<span class="text-gray-500 text-xs">+${keywordsArray.length - 3}</span>`
                : ''
            }
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
      className="block border border-gray-300 rounded-lg shadow-lg hover:shadow-2xl transition duration-300 p-6 bg-white hover:bg-gray-50"
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
        <span className={`text-xs ${scoreClass} rounded-full px-2 py-1`}>{scoreText}</span>
      </div>

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

export default HouseCard;
