"use client";
import { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const HousingFilter = ({ onFilterChange }) => {
  const [filters, setFilters] = useState({
    school: "unsw",
    priceMin: "",
    priceMax: "",
    bedroomsMin: "",
    bedroomsMax: "",
    bathrooms: "",
    propertyType: [],
    minScore: 13,
    commuteMin: "",
    commuteMax: "",
    moveInDate: null,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === "checkbox") {
      setFilters((prev) => ({
        ...prev,
        propertyType: checked
          ? [...prev.propertyType, value]
          : prev.propertyType.filter((t) => t !== value),
      }));
    } else {
      setFilters((prev) => ({ ...prev, [name]: value }));
    }

    onFilterChange(filters);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold">Filters</h2>

      {/* School Selection */}
      <div>
        <label className="block text-sm font-medium">Target School</label>
        <select
          name="school"
          className="w-full p-2 border rounded"
          value={filters.school}
          onChange={handleChange}
        >
          <option value="unsw">University of New South Wales (UNSW)</option>
          <option value="usyd">University of Sydney (USYD)</option>
        </select>
      </div>

      {/* Price Range */}
      <div>
        <label className="block text-sm font-medium">
          Price Range (per week)
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            name="priceMin"
            placeholder="Min"
            className="w-1/2 p-2 border rounded"
            onChange={handleChange}
          />
          <input
            type="number"
            name="priceMax"
            placeholder="Max"
            className="w-1/2 p-2 border rounded"
            onChange={handleChange}
          />
        </div>
      </div>

      {/* Move-in Date */}
      <div>
        <label className="block text-sm font-medium">Move-in Date</label>
        <DatePicker
          selected={filters.moveInDate}
          onChange={(date) => setFilters({ ...filters, moveInDate: date })}
          className="w-full p-2 border rounded"
        />
      </div>

      {/* Property Type */}
      <div>
        <label className="block text-sm font-medium">Property Type</label>
        <div className="flex flex-wrap gap-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" value="Apartment" onChange={handleChange} />
            Apartment
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" value="House" onChange={handleChange} />
            House
          </label>
        </div>
      </div>
    </div>
  );
};

export default HousingFilter;
