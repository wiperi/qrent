"use client";
import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRobot } from "@fortawesome/free-solid-svg-icons";

const JustForYou = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  /**
   * TODO:
   * FIX ME AFTER BACKEND API FINISH
   */
  // Simulated API Fetch Function
  const fetchRecommendations = async () => {
    setLoading(true);
    setError(false);

    try {
      const response = await fetch("/api/recommendations"); // Replace with your API endpoint

      if (!response.ok) throw new Error("Failed to fetch recommendations");

      const data = await response.json();
      setListings(data);
      setLoading(false);
    } catch (err) {
      console.error("Fetching recommendations failed:", err);
      setError(true);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  return (
    <div className="max-w-screen-lg mx-auto mt-8 px-6">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FontAwesomeIcon icon={faRobot} className="text-blue-primary" />
          Smart Recommendations
        </h2>
        <span className="bg-blue-100 text-blue-primary px-3 py-1 rounded-full text-sm">
          Match Priority
        </span>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center text-gray-500">
          <i className="fas fa-spinner fa-spin"></i> Loading recommended
          listings...
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center text-red-500">
          Failed to load recommendations. Please try again.
        </div>
      )}

      {/* Listings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {!loading &&
          !error &&
          listings.map((house, index) => (
            <div
              key={index}
              className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition cursor-pointer"
              onClick={() => window.open(house.website, "_blank")}
            >
              <h3 className="text-lg font-semibold">{house.title}</h3>
              <p className="text-gray-600">{house.location}</p>
              <p className="text-blue-500 font-bold">${house.price}/week</p>
            </div>
          ))}

        {!loading && !error && listings.length === 0 && (
          <p className="text-center text-gray-500 col-span-3">
            No recommendations available
          </p>
        )}
      </div>
    </div>
  );
};

export default JustForYou;
