import { useState } from "react";
import PriceDropdown from "./priceDropDown";
import bgImg from "../../public/searchBG.jpg";
import MoreFilterModal from "./MoreFilterModal";

export default function Search() {
  const [filter, setFilter] = useState({
    university: "Any",
    priceMin: "Any",
    priceMax: "Any",
    travelTime: "Any",
    bedroomMin: "Any",
    bedroomMax: "Any",
    bathroomMin: "Any",
    bathroomMax: "Any",
    propertyType: "Any",
    area: "Any",
    rate: 0,
    avaliableDate: "Any",
  });

  return (
    <>
      <section
        className="hero bg-cover h-80 mt-8"
        style={{
          backgroundImage: `url(${bgImg.src})`,
        }}
      >
        <div className="bg-white p-4 shadow rounded-lg flex gap-4 font-semibold justify-between flex-wrap mt-8 mx-auto max-w-screen-lg w-full">
          <div className="flex-1">
            <div className="text-sm text-gray-600">University</div>
            <select
              className="border rounded px-2 py-1 max-h-40 overflow-y-auto w-full"
              value={filter.university}
              onChange={(e) =>
                setFilter({ ...filter, university: e.target.value })
              }
            >
              <option>Any</option>
              <option>UNSW</option>
              <option>USYD</option>
              <option>UTS</option>
              <option>MQ Uni</option>
            </select>
          </div>

          <div className="flex-1">
            <PriceDropdown
              label="Price Min"
              name="priceMin"
              filter={filter}
              setFilter={setFilter}
            />
          </div>

          <div className="flex-1">
            <PriceDropdown
              label="Price Max"
              name="priceMax"
              filter={filter}
              setFilter={setFilter}
            />
          </div>

          <div className="flex-1">
            <div className="text-sm text-gray-600">Travel Time</div>
            <select
              className="border rounded px-2 py-1 max-h-40 overflow-y-auto w-full"
              value={filter.travelTime}
              onChange={(e) =>
                setFilter({ ...filter, travelTime: e.target.value })
              }
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

          <div className="flex gap-4">
            <MoreFilterModal filter={filter} setFilter={setFilter} />
            <button className="bg-blue-primary text-white px-4 py-1 rounded">
              <a href="/findAHome">Go</a>
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
