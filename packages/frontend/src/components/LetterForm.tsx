"use client";

import { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const LetterForm = () => {
  const [openAccordion, setOpenAccordion] = useState(null);
  const [isCoverLetter, setIsCoverLetter] = useState(true);
  const [moveInDate, setMoveInDate] = useState(null);

  const toggleAccordion = (index) => {
    setOpenAccordion(openAccordion === index ? null : index);
  };

  const handleToggleForm = (isCoverLetter) => {
    setIsCoverLetter(isCoverLetter);
  };

  return (
    <div className="space-y-6">
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => handleToggleForm(true)}
          className={`px-6 py-3 rounded-md text-lg font-semibold ${
            isCoverLetter
              ? "bg-blue-primary text-white shadow-md"
              : "bg-gray-300 text-gray-800"
          }`}
        >
          Cover Letter
        </button>
        <button
          onClick={() => handleToggleForm(false)}
          className={`px-6 py-3 rounded-md text-lg font-semibold ${
            !isCoverLetter
              ? "bg-blue-primary text-white shadow-md"
              : "bg-gray-300 text-gray-800"
          }`}
        >
          Parent Letter
        </button>
      </div>

      {isCoverLetter ? (
        <div className="space-y-6">
          {/* Student Information */}
          <div className="pb-1">
            <h2 className="text-xl font-semibold">
              <button
                className="w-full text-left py-3 px-4 bg-gray-100 rounded-md"
                onClick={() => toggleAccordion(1)}
              >
                1. Student Information
              </button>
            </h2>
            <div
              className={`transition-all duration-500 ease-in-out max-h-0 overflow-hidden ${
                openAccordion === 1 ? "max-h-screen opacity-100" : "opacity-0"
              }`}
            >
              {openAccordion === 1 && (
                <div className="space-y-6 px-6 py-4">
                  <div>
                    <label className="block text-sm font-medium">
                      Legal Full Name
                    </label>
                    <input
                      type="text"
                      className="form-input mt-2 block w-full rounded-md border-gray-300"
                      placeholder="e.g., Zhang Ming"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">
                      University
                    </label>
                    <select className="form-select mt-2 block w-full rounded-md border-gray-300">
                      <option value="unsw">UNSW</option>
                      <option value="usyd">USYD</option>
                      <option value="uts">UTS</option>
                      <option value="macquarie">Macquarie University</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Major</label>
                    <input
                      type="text"
                      className="form-input mt-2 block w-full rounded-md border-gray-300"
                      placeholder="e.g., Computer Science"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Living Plan */}
          <div className="pb-1">
            <h2 className="text-xl font-semibold">
              <button
                className="w-full text-left py-3 px-4 bg-gray-100 rounded-md"
                onClick={() => toggleAccordion(2)}
              >
                2. Living Plan
              </button>
            </h2>
            <div
              className={`transition-all duration-500 ease-in-out max-h-0 overflow-hidden ${
                openAccordion === 2 ? "max-h-screen opacity-100" : "opacity-0"
              }`}
            >
              {openAccordion === 2 && (
                <div className="space-y-6 px-6 py-4">
                  <div>
                    <label className="block text-sm font-medium">
                      Move-in Date
                    </label>
                    <DatePicker
                      selected={moveInDate}
                      onChange={(date) => setMoveInDate(date)}
                      className="form-input mt-2 block w-full rounded-md border-gray-300"
                      placeholderText="Select a date"
                      dateFormat="yyyy/MM/dd"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">
                      Lease Term
                    </label>
                    <input
                      type="number"
                      className="form-input mt-2 block w-full rounded-md border-gray-300"
                      min="1"
                      max="24"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">
                      Rent Budget
                    </label>
                    <input
                      type="number"
                      className="form-input block w-full rounded-md border-gray-300"
                      min="100"
                      required
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Financial Statement */}
          <div className="pb-1">
            <div>
              {" "}
              <h2 className="text-xl font-semibold">
                <button
                  className="w-full text-left py-3 px-4 bg-gray-100 rounded-md"
                  onClick={() => toggleAccordion(3)}
                >
                  3. Financial Statement
                </button>
              </h2>
            </div>
          </div>

          {/* Rental History */}
          <div className="pb-1">
            <div>
              {" "}
              <h2 className="text-xl font-semibold">
                <button
                  className="w-full text-left py-3 px-4 bg-gray-100 rounded-md"
                  onClick={() => toggleAccordion(4)}
                >
                  4. Rental History
                </button>
              </h2>
            </div>
          </div>

          {/* Background */}
          <div className="pb-1">
            <div>
              {" "}
              <h2 className="text-xl font-semibold">
                <button
                  className="w-full text-left py-3 px-4 bg-gray-100 rounded-md"
                  onClick={() => toggleAccordion(5)}
                >
                  5. Background
                </button>
              </h2>
            </div>
          </div>

          {/* List of Document */}
          <div className="pb-1">
            <div>
              {" "}
              <h2 className="text-xl font-semibold">
                <button
                  className="w-full text-left py-3 px-4 bg-gray-100 rounded-md"
                  onClick={() => toggleAccordion(6)}
                >
                  6. List of Document
                </button>
              </h2>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Guarantor Information */}
          <div className="pb-1">
            <div>
              {" "}
              <h2 className="text-xl font-semibold">
                <button
                  className="w-full text-left py-3 px-4 bg-gray-100 rounded-md"
                  onClick={() => toggleAccordion(1)}
                >
                  1. Guarantor Information
                </button>
              </h2>
            </div>
          </div>

          {/* Financial Support */}
          <div className="pb-1">
            <div>
              {" "}
              <h2 className="text-xl font-semibold">
                <button
                  className="w-full text-left py-3 px-4 bg-gray-100 rounded-md"
                  onClick={() => toggleAccordion(2)}
                >
                  2. Finalcial Support
                </button>
              </h2>
            </div>
          </div>

          {/* Proof of Guarantor's Ability */}
          <div className="pb-1">
            <div>
              {" "}
              <h2 className="text-xl font-semibold">
                <button
                  className="w-full text-left py-3 px-4 bg-gray-100 rounded-md"
                  onClick={() => toggleAccordion(3)}
                >
                  3. Proof of Guarantor's Ability
                </button>
              </h2>
            </div>
          </div>

          {/* Additional Commitment */}
          <div className="pb-1">
            <div>
              {" "}
              <h2 className="text-xl font-semibold">
                <button
                  className="w-full text-left py-3 px-4 bg-gray-100 rounded-md"
                  onClick={() => toggleAccordion(4)}
                >
                  4. Additional Commitment
                </button>
              </h2>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LetterForm;
