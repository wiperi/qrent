"use client";
import { useState, useEffect } from "react";

const HousingList = ({ filter }) => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  /**
   * TODO
   * FIX ME: CHANGE AFTER BACKEND API FINISH
   */
  useEffect(() => {
    fetch("/api/housing")
      .then((res) => res.json())
      .then((data) => {
        setListings(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [filter]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {loading ? (
        <p>Loading...</p>
      ) : listings.length === 0 ? (
        <p>No listings found</p>
      ) : (
        listings.map((listing) => (
          <div
            key={listing.id}
            className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition"
          >
            <h3 className="font-semibold">{listing.title}</h3>
            <p>{listing.location}</p>
            <p className="text-blue-primary">${listing.price}/week</p>
          </div>
        ))
      )}
    </div>
  );
};

export default HousingList;
