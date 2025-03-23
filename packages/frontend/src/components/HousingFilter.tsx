import React from "react";
import PriceDropdown from "./priceDropDown";
import RatingSlider from "./Slider";

const HousingFilter = ({ filter, setFilter }) => {
  return (
    <>
      <div className="flex gap-4 justify-center items-center">
        {/* Header */}
        <div className="flex flex-col gap-1 font-semibold text-2xl">
          Filters
        </div>
      </div>

      {/* University */}
      <div className="border-b pb-4 mt-3">
        <div className="text-lg text-gray-600 font-semibold">University</div>
        <select
          className="border rounded px-2 py-1 max-h-40 overflow-y-auto w-full"
          value={filter.university}
          onChange={(e) => setFilter({ ...filter, university: e.target.value })}
        >
          <option>Any</option>
          <option>UNSW</option>
          <option>USYD</option>
          <option>UTS</option>
          <option>MQ UNI</option>
        </select>
      </div>

      {/* Price Range */}
      <div className="border-b pb-4 mt-3">
        <div className="text-lg text-gray-600 font-semibold">Price</div>
        <div className="flex justify-between gap-4">
          <div className="flex-1">
            <PriceDropdown
              label="Min"
              name="priceMin"
              filter={filter}
              setFilter={setFilter}
            />
          </div>
          <div className="flex-1">
            <PriceDropdown
              label="Max"
              name="priceMax"
              filter={filter}
              setFilter={setFilter}
            />
          </div>
        </div>
      </div>

      {/* BedroomNum */}
      <div className="border-b pb-4 mt-3">
        <div className="text-lg text-gray-600 font-semibold">Bedrooms</div>
        <div className="flex justify-between gap-4">
          <div className="flex-1">
            <div className="text-sm text-gray-600">Min</div>
            <select
              className="border rounded px-2 py-1 max-h-40 overflow-y-auto w-full"
              value={filter.bedroomMin}
              onChange={(e) =>
                setFilter({ ...filter, bedroomMin: e.target.value })
              }
            >
              <option>Any</option>
              <option>1</option>
              <option>2</option>
              <option>3</option>
            </select>
          </div>
          <div className="flex-1">
            <div className="text-sm text-gray-600">Max</div>
            <select
              className="border rounded px-2 py-1 max-h-40 overflow-y-auto w-full"
              value={filter.bedroomMax}
              onChange={(e) =>
                setFilter({ ...filter, bedroomMax: e.target.value })
              }
            >
              <option>Any</option>
              <option>1</option>
              <option>2</option>
              <option>3</option>
            </select>
          </div>
        </div>
      </div>

      {/* BathroomNum */}
      <div className="border-b pb-4 mt-3">
        <div className="text-lg text-gray-600 font-semibold">Bathrooms</div>
        <div className="flex justify-between gap-4">
          <div className="flex-1">
            <div className="text-sm text-gray-600">Min</div>
            <select
              className="border rounded px-2 py-1 max-h-40 overflow-y-auto w-full"
              value={filter.bathroomMin}
              onChange={(e) =>
                setFilter({ ...filter, bathroomMin: e.target.value })
              }
            >
              <option>Any</option>
              <option>1</option>
              <option>2</option>
              <option>3</option>
            </select>
          </div>
          <div className="flex-1">
            <div className="text-sm text-gray-600">Max</div>
            <select
              className="border rounded px-2 py-1 max-h-40 overflow-y-auto w-full"
              value={filter.bathroomMax}
              onChange={(e) =>
                setFilter({ ...filter, bathroomMax: e.target.value })
              }
            >
              <option>Any</option>
              <option>1</option>
              <option>2</option>
              <option>3</option>
            </select>
          </div>
        </div>
      </div>

      {/* Property Type */}
      <div className="border-b pb-4 mt-3">
        <div className="text-sm text-gray-600 font-semibold">Property Type</div>
        <div className="flex justify-between items-center gap-3 mt-3">
          <select
            className="border rounded px-2 py-1 max-h-40 overflow-y-auto w-full"
            value={filter.propertyType}
            onChange={(e) =>
              setFilter({ ...filter, propertyType: e.target.value })
            }
          >
            <option>Any</option>
            <option>House</option>
            <option>Apartment/Unit</option>
          </select>
        </div>
      </div>

      {/* Rate */}
      <div className="border-b pb-4 mt-3">
        <div className="text-sm text-gray-600 font-semibold">Rate</div>
        <RatingSlider filter={filter} setFilter={setFilter} />
      </div>

      <div className="border-b pb-4 mt-3">
        <div className="text-sm text-gray-600">Travel Time</div>
        <select
          className="border rounded px-2 py-1 max-h-40 overflow-y-auto w-full"
          value={filter.travelTime}
          onChange={(e) => setFilter({ ...filter, travelTime: e.target.value })}
        >
          <option>Any</option>
          <option>10 min</option>
          <option>20 min</option>
          <option>30 min</option>
          <option>40 min</option>
          <option>50 min</option>
          <option>1h</option>
          <option>1.5h</option>
          <option>2h</option>
        </select>
      </div>

      {/* Avaliable Date */}
      <div className="pb-4 mt-3">
        <div className="text-sm text-gray-600 font-semibold">
          Avaliable Date
        </div>
        <input
          type="date"
          className="border rounded px-2 py-1 mt-2"
          value={filter.avaliableDate}
          onChange={(e) =>
            setFilter({ ...filter, avaliableDate: e.target.value })
          }
        />
      </div>
    </>
  );
};

export default HousingFilter;
