"use client";

import { useState } from "react";
import "react-datepicker/dist/react-datepicker.css";

const LetterForm = () => {
  const [openAccordion, setOpenAccordion] = useState(null);
  const [isCoverLetter, setIsCoverLetter] = useState(true);

  const [CLInfo, setCLInfo] = useState({
    name: "",
    university: "",
    major: "",
    moveInDate: "",
    leaseTerm: "",
    budget: "",
    financialStatement: [],
    rentalHistory: "",
    previousExperiences: [],
    personality: [],
    bgInfo: "",
    // listOfDoc: "",
  });

  const financialStatementOpts = [
    "Parent Letter",
    "Account Balance",
    "Proof of Income",
    "Scholarship",
  ];

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = event.target;

    setCLInfo((prevState) => {
      // If checked, add the value to the proofOfFunds array, otherwise remove it
      const newProofOfFunds = checked
        ? [...prevState.financialStatement, value]
        : prevState.financialStatement.filter((item) => item !== value);

      return { ...prevState, financialStatement: newProofOfFunds };
    });
  };

  const personalityOpts = [
    "I don't smoke",
    "I don't have pets",
    "I prefer a quiet lifestyle",
    "I'm tidy and organized",
    "I don't host parties",
    "I follow a regular schedule",
  ];

  const handlePersonalityCheckboxChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { value, checked } = event.target;

    setCLInfo((prevState) => {
      // If checked, add the value to the proofOfFunds array, otherwise remove it
      const personalities = checked
        ? [...prevState.personality, value]
        : prevState.personality.filter((item) => item !== value);

      return { ...prevState, personality: personalities };
    });
  };

  const handleRentalHistoryChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    setCLInfo((prevState) => ({
      ...prevState,
      rentalHistory: value,
      previousExperience:
        value === "first-time" ? "" : prevState.previousExperiences, // Clear if first-time
    }));
  };

  const [PLInfo, setPLInfo] = useState({
    fatherName: "",
    motherName: "",
    fatherContactNum: "",
    motherContactNum: "",
    contactEmail: "",
    studentName: "",
    homeAddress: "",
    weeklyRent: "",
    livingExpenses: "",
    sourceOfFunds: "",
    accountBalance: "",
    annualIncome: "",
    proofDocs: "",
    prepayRent: "",
    liabilityStatement: "",
    otherCommitments: "",
  });

  const toggleAccordion = (index) => {
    setOpenAccordion(openAccordion === index ? null : index);
  };

  const handleToggleForm = (isCoverLetter) => {
    setIsCoverLetter(isCoverLetter);
  };

  // Add a new empty rental experience
  const addExperience = () => {
    setCLInfo({
      ...CLInfo,
      previousExperiences: [...CLInfo.previousExperiences, ""],
    });
  };

  // Update an experience at a specific index
  const handleExperienceChange = (index, value) => {
    const updatedExperiences = [...CLInfo.previousExperiences];
    updatedExperiences[index] = value;
    setCLInfo({ ...CLInfo, previousExperiences: updatedExperiences });
  };

  // Remove an experience at a specific index
  const removeExperience = (index) => {
    const updatedExperiences = CLInfo.previousExperiences.filter(
      (_, i) => i !== index
    );
    setCLInfo({ ...CLInfo, previousExperiences: updatedExperiences });
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
                      value={CLInfo.name ?? ""}
                      placeholder="e.g. Zhang Ming"
                      onChange={(e) =>
                        setCLInfo({ ...CLInfo, name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">
                      University
                    </label>
                    <select
                      className="form-select mt-2 block w-full rounded-md border-gray-300"
                      value={CLInfo.university ?? ""}
                      onChange={(e) =>
                        setCLInfo({ ...CLInfo, university: e.target.value })
                      }
                    >
                      <option value="unsw">UNSW</option>
                      <option value="usyd">USYD</option>
                      <option value="uts">UTS</option>
                      <option value="macquarie">MQ UNI</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Major</label>
                    <input
                      type="text"
                      className="form-input mt-2 block w-full rounded-md border-gray-300"
                      placeholder="e.g. Computer Science"
                      value={CLInfo.major}
                      onChange={(e) =>
                        setCLInfo({ ...CLInfo, major: e.target.value })
                      }
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
                    <input
                      type="date"
                      value={CLInfo.moveInDate}
                      onChange={(e) =>
                        setCLInfo({ ...CLInfo, moveInDate: e.target.value })
                      }
                      className="form-input mt-2 block w-full rounded-md border-gray-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">
                      Lease Term (Month)
                    </label>
                    <input
                      type="number"
                      className="form-input mt-2 block w-full rounded-md border-gray-300"
                      min="1"
                      max="24"
                      required
                      value={CLInfo.leaseTerm}
                      onChange={(e) =>
                        setCLInfo({ ...CLInfo, leaseTerm: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">
                      Rent Budget (Per Week)
                    </label>
                    <input
                      type="number"
                      className="form-input block w-full rounded-md border-gray-300"
                      min="100"
                      required
                      value={CLInfo.budget}
                      onChange={(e) =>
                        setCLInfo({ ...CLInfo, budget: e.target.value })
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Financial Statement */}
          <div className="pb-1">
            <h2 className="text-xl font-semibold">
              <button
                className="w-full text-left py-3 px-4 bg-gray-100 rounded-md"
                onClick={() => toggleAccordion(3)}
              >
                3. Financial Statement
              </button>
            </h2>
            <div
              className={`transition-all duration-500 ease-in-out max-h-0 overflow-hidden ${
                openAccordion === 3 ? "max-h-screen opacity-100" : "opacity-0"
              }`}
            >
              {openAccordion === 3 && (
                <div className="space-y-6 px-6 py-4">
                  <div>
                    <label className="block text-sm font-medium">
                      Proof of Funds Avaliable (Multiple selection allowed)
                    </label>
                    <div className="space-y-2 mt-4">
                      {/* Render checkboxes dynamically */}
                      {financialStatementOpts.map((option) => (
                        <div key={option} className="flex items-center">
                          <input
                            type="checkbox"
                            id={option}
                            name="proofOfFunds"
                            value={option}
                            checked={CLInfo.financialStatement.includes(option)}
                            onChange={handleCheckboxChange}
                            className="mr-2"
                          />
                          <label htmlFor={option} className="text-sm">
                            {option}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Rental History */}
          <div className="pb-1">
            <h2 className="text-xl font-semibold">
              <button
                className="w-full text-left py-3 px-4 bg-gray-100 rounded-md"
                onClick={() => toggleAccordion(4)}
              >
                4. Rental History
              </button>
            </h2>

            <div
              className={`transition-all duration-500 ease-in-out max-h-0 overflow-hidden ${
                openAccordion === 4 ? "max-h-screen opacity-100" : "opacity-0"
              }`}
            >
              {openAccordion === 4 && (
                <div className="space-y-6 px-6 py-4">
                  {/* Radio Buttons */}
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="rentalHistory"
                        value="first-time"
                        checked={CLInfo.rentalHistory === "first-time"}
                        onChange={handleRentalHistoryChange}
                        className="mr-2"
                      />
                      This is my first time
                    </label>

                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="rentalHistory"
                        value="not-first-time"
                        checked={CLInfo.rentalHistory === "not-first-time"}
                        onChange={handleRentalHistoryChange}
                        className="mr-2"
                      />
                      This is not my first time
                    </label>
                  </div>

                  {/* Additional Section for Previous Rental Experience */}
                  {CLInfo.rentalHistory === "not-first-time" && (
                    <div className="mt-4 space-y-4 transition-all duration-500">
                      <label className="block text-sm font-medium">
                        Previous Rental Experience
                      </label>

                      {/* Map through the rental history array */}
                      {CLInfo.previousExperiences.map((experience, index) => (
                        <div
                          key={index}
                          className="relative p-4 border rounded-md"
                        >
                          <textarea
                            className="form-input block w-full rounded-md border-gray-300 focus:outline-none focus:ring-0 focus:border-gray-300"
                            rows={3}
                            placeholder="Describe your previous rental experience. (Address, rental duration, rent, landlord reference letter.)"
                            value={experience}
                            onChange={(e) =>
                              handleExperienceChange(index, e.target.value)
                            }
                          />
                          <button
                            className="absolute top-1 right-1 text-red-500"
                            onClick={() => removeExperience(index)}
                          >
                            Delete
                          </button>
                        </div>
                      ))}

                      {/* Add More Experience Button */}
                      <button
                        className="mt-2 px-4 py-2 bg-blue-primary text-white rounded-md"
                        onClick={addExperience}
                      >
                        Add More Experience
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Background Information */}
          <div className="pb-1">
            <h2 className="text-xl font-semibold">
              <button
                className="w-full text-left py-3 px-4 bg-gray-100 rounded-md"
                onClick={() => toggleAccordion(5)}
              >
                5. Backgound
              </button>
            </h2>
            <div
              className={`transition-all duration-500 ease-in-out max-h-0 overflow-hidden ${
                openAccordion === 5 ? "max-h-screen opacity-100" : "opacity-0"
              }`}
            >
              {openAccordion === 5 && (
                <div className="space-y-6 px-6 py-4">
                  <div>
                    <label className="block text-sm font-medium">
                      Personality (Multiple selection allowed)
                    </label>
                    <div className="space-y-2 mt-4">
                      {/* Render checkboxes dynamically */}
                      {personalityOpts.map((option) => (
                        <div key={option} className="flex items-center">
                          <input
                            type="checkbox"
                            id={option}
                            name="personalities"
                            value={option}
                            checked={CLInfo.personality.includes(option)}
                            onChange={handlePersonalityCheckboxChange}
                            className="mr-2"
                          />
                          <label htmlFor={option} className="text-sm">
                            {option}
                          </label>
                        </div>
                      ))}
                    </div>

                    <label className="block text-sm font-medium mt-3">
                      Additional Information
                    </label>
                    <div className="relative p-4 border rounded-md mt-3">
                      <textarea
                        className="form-input block w-full rounded-md border-gray-300 focus:outline-none focus:ring-0 focus:border-gray-300"
                        rows={3}
                        placeholder="Add more information about yourself..."
                        value={CLInfo.bgInfo}
                        onChange={(e) =>
                          setCLInfo({ ...CLInfo, bgInfo: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* List of Document */}
          {/* <div className="pb-1">
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
          </div> */}
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
