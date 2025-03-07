"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faBell,
  faSpinner,
  faExclamationCircle,
  faArrowRight,
} from "@fortawesome/free-solid-svg-icons";

const JustLanded = () => {
  const [school, setSchool] = useState("unsw"); // Default school is UNSW
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [updateCount, setUpdateCount] = useState("Loading...");

  /** TODO:
   *  REPLACE ME AFTER BACKEND API COMPLETE
   */
  // Function to fetch daily listings
  const fetchDailyListings = async (selectedSchool) => {
    setLoading(true);
    setError(false);

    try {
      const baseUrl = "// url"; // Replace with actual API base URL
      const endpoint =
        selectedSchool === "unsw"
          ? "/api/daily-houses/list"
          : "/api/daily-houses/usyd/list";

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ min_score: 14, limit: 9 }), // Fetch 9 listings
      });

      if (!response.ok) throw new Error("Failed to fetch listings");

      const houses = await response.json();
      setListings(houses);

      // Fetch daily update count
      const statsEndpoint =
        selectedSchool === "unsw"
          ? "/api/daily-houses/stats"
          : "/api/daily-houses/usyd/stats";
      const statsResponse = await fetch(`${baseUrl}${statsEndpoint}`, {
        method: "GET",
      });

      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        setUpdateCount(stats.todayCount || "0");
      } else {
        setUpdateCount(houses.length);
      }

      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch daily listings:", error);
      setError(true);
      setLoading(false);
    }
  };

  // Fetch listings on component mount
  useEffect(() => {
    fetchDailyListings(school);
  }, [school]);

  return (
    <div className="max-w-screen-lg mx-auto mt-10 px-6">
      {/* Section Header */}
      <div className="flex justify-between items-center border-b pb-2 mb-4">
        {/* Title + Controls */}
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <FontAwesomeIcon icon={faHome} className="text-blue-primary" />
            Just Landed
          </h2>
          {/* School Toggle Buttons */}
          <div className="flex border rounded-lg overflow-hidden">
            <button
              className={`px-4 py-2 ${
                school === "unsw" ? "bg-blue-primary text-white" : "bg-gray-200"
              }`}
              onClick={() => setSchool("unsw")}
            >
              UNSW
            </button>
            <button
              className={`px-4 py-2 ${
                school === "usyd" ? "bg-blue-primary text-white" : "bg-gray-200"
              }`}
              onClick={() => setSchool("usyd")}
            >
              USYD
            </button>
          </div>
        </div>

        {/* Subscribe Button */}
        <button className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
          <FontAwesomeIcon icon={faBell} />
          Subscribe
        </button>
      </div>

      {/* Section Actions */}
      <div className="flex justify-between items-center mb-4">
        <span className="bg-gray-200 px-3 py-1 rounded-full text-sm">
          Today's Updates: {updateCount}
        </span>
        <Link
          href="/findAHome"
          className="text-blue-primary hover:underline flex items-center"
        >
          View All <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
        </Link>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center gap-2 text-gray-500">
          <FontAwesomeIcon icon={faSpinner} spin />
          Loading latest listings...
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-2 text-red-500">
          <FontAwesomeIcon icon={faExclamationCircle} />
          Failed to load listings. Please try again.
          <button
            className="bg-red-500 text-white px-4 py-1 rounded-lg ml-2"
            onClick={() => fetchDailyListings(school)}
          >
            Retry
          </button>
        </div>
      )}

      {/* Listings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        {!loading && !error && listings.length === 0 && (
          <p className="text-center text-gray-500 col-span-3">
            No new listings available
          </p>
        )}

        {!loading &&
          !error &&
          listings.map((house, index) => (
            <div
              key={index}
              className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition cursor-pointer"
              onClick={() =>
                house.website && window.open(house.website, "_blank")
              }
            >
              <h3 className="text-lg font-semibold">{house.title}</h3>
              <p className="text-gray-600">{house.location}</p>
              <p className="text-blue-500 font-bold">${house.price}/week</p>
            </div>
          ))}
      </div>
    </div>
  );
};

export default JustLanded;
