'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import 'react-datepicker/dist/react-datepicker.css';

const LetterForm = () => {
  const [openAccordion, setOpenAccordion] = useState(null);
  const [isCoverLetter, setIsCoverLetter] = useState(true);

  const t = useTranslations('PrepareDocuments');

  const [CLInfo, setCLInfo] = useState({
    name: '',
    university: '',
    major: '',
    moveInDate: '',
    leaseTerm: '',
    budget: '',
    financialStatement: [],
    rentalHistory: '',
    previousExperiences: [],
    personality: [],
    bgInfo: '',
    // listOfDoc: "",
  });

  const financialStatementOpts = [
    'Parent Letter',
    t('account-balance'),
    t('proof-of-income'),
    t('scholarship'),
  ];

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = event.target;

    setCLInfo(prevState => {
      // If checked, add the value to the proofOfFunds array, otherwise remove it
      const newProofOfFunds = checked
        ? [...prevState.financialStatement, value]
        : prevState.financialStatement.filter(item => item !== value);

      return { ...prevState, financialStatement: newProofOfFunds };
    });
  };

  const personalityOpts = [
    t('no-smoke'),
    t('no-pets'),
    t('quiet-lifestyle'),
    t('tidy'),
    t('no-party'),
    t('regular-schedule'),
  ];

  const handlePersonalityCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = event.target;

    setCLInfo(prevState => {
      // If checked, add the value to the proofOfFunds array, otherwise remove it
      const personalities = checked
        ? [...prevState.personality, value]
        : prevState.personality.filter(item => item !== value);

      return { ...prevState, personality: personalities };
    });
  };

  const handleRentalHistoryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setCLInfo(prevState => ({
      ...prevState,
      rentalHistory: value,
      previousExperience: value === 'first-time' ? '' : prevState.previousExperiences, // Clear if first-time
    }));
  };

  const [PLInfo, setPLInfo] = useState({
    fatherName: '',
    motherName: '',
    fatherContactNum: '',
    motherContactNum: '',
    contactEmail: '',
    studentName: '',
    homeAddress: '',
    weeklyRent: '',
    livingExpenses: '',
    sourceOfFunds: '',
    accountBalance: '',
    annualIncome: '',
    proofDocs: '',
    prepayRent: '',
    liabilityStatement: '',
    otherCommitments: '',
  });

  const sourceOfFundsOpts = [
    t('salary-income'),
    t('savings'),
    t('property-income'),
    t('investment-income'),
  ];

  const handleSourceFundsCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = event.target;

    setPLInfo(prevState => {
      // If checked, add the value to the proofOfFunds array, otherwise remove it
      const source = checked
        ? [...prevState.sourceOfFunds, value]
        : prevState.sourceOfFunds.filter(item => item !== value);

      return { ...prevState, sourceOfFunds: source };
    });
  };

  const proofDocsOpts = [t('bank-statement'), t('income-proof'), t('property-proof'), t('tax')];

  const handleProofDocsCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = event.target;

    setPLInfo(prevState => {
      // If checked, add the value to the proofOfFunds array, otherwise remove it
      const source = checked
        ? [...prevState.proofDocs, value]
        : prevState.proofDocs.filter(item => item !== value);

      return { ...prevState, proofDocs: source };
    });
  };

  const toggleAccordion = index => {
    setOpenAccordion(openAccordion === index ? null : index);
  };

  const handleToggleForm = isCoverLetter => {
    setIsCoverLetter(isCoverLetter);
  };

  // Add a new empty rental experience
  const addExperience = () => {
    setCLInfo({
      ...CLInfo,
      previousExperiences: [...CLInfo.previousExperiences, ''],
    });
  };

  // Update an experience at a specific index
  const handleExperienceChange = (index, value) => {
    const updatedExperiences = [...CLInfo.previousExperiences];
    updatedExperiences[index] = value;
    setCLInfo({ ...CLInfo, previousExperiences: updatedExperiences });
  };

  // Remove an experience at a specific index
  const removeExperience = index => {
    const updatedExperiences = CLInfo.previousExperiences.filter((_, i) => i !== index);
    setCLInfo({ ...CLInfo, previousExperiences: updatedExperiences });
  };

  return (
    <div className="space-y-6">
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => handleToggleForm(true)}
          className={`px-6 py-3 rounded-md text-lg font-semibold ${
            isCoverLetter ? 'bg-blue-primary text-white shadow-md' : 'bg-gray-300 text-gray-800'
          }`}
        >
          Cover Letter
        </button>
        <button
          onClick={() => handleToggleForm(false)}
          className={`px-6 py-3 rounded-md text-lg font-semibold ${
            !isCoverLetter ? 'bg-blue-primary text-white shadow-md' : 'bg-gray-300 text-gray-800'
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
                1. {t('student-info')}
              </button>
            </h2>
            <div
              className={`transition-all duration-500 ease-in-out max-h-0 overflow-hidden ${
                openAccordion === 1 ? 'max-h-screen opacity-100' : 'opacity-0'
              }`}
            >
              {openAccordion === 1 && (
                <div className="space-y-6 px-6 py-4">
                  <div>
                    <label className="block text-sm font-medium">{t('full-name')}</label>
                    <input
                      type="text"
                      className="form-input mt-2 block w-full rounded-md border-gray-300"
                      value={CLInfo.name ?? ''}
                      placeholder="e.g. Zhang Ming"
                      onChange={e => setCLInfo({ ...CLInfo, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">{t('uni')}</label>
                    <select
                      className="form-select mt-2 block w-full rounded-md border-gray-300"
                      value={CLInfo.university ?? ''}
                      onChange={e => setCLInfo({ ...CLInfo, university: e.target.value })}
                    >
                      <option value="unsw">UNSW</option>
                      <option value="usyd">USYD</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium">{t('major')}</label>
                    <input
                      type="text"
                      className="form-input mt-2 block w-full rounded-md border-gray-300"
                      placeholder="e.g. Computer Science"
                      value={CLInfo.major}
                      onChange={e => setCLInfo({ ...CLInfo, major: e.target.value })}
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
                2. {t('living-plan')}
              </button>
            </h2>
            <div
              className={`transition-all duration-500 ease-in-out max-h-0 overflow-hidden ${
                openAccordion === 2 ? 'max-h-screen opacity-100' : 'opacity-0'
              }`}
            >
              {openAccordion === 2 && (
                <div className="space-y-6 px-6 py-4">
                  <div>
                    <label className="block text-sm font-medium">{t('move-in-date')}</label>
                    <input
                      type="date"
                      value={CLInfo.moveInDate}
                      onChange={e => setCLInfo({ ...CLInfo, moveInDate: e.target.value })}
                      className="form-input mt-2 block w-full rounded-md border-gray-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">{t('lease-term')}</label>
                    <input
                      type="number"
                      className="form-input mt-2 block w-full rounded-md border-gray-300"
                      min="1"
                      max="24"
                      required
                      value={CLInfo.leaseTerm}
                      onChange={e => setCLInfo({ ...CLInfo, leaseTerm: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">{t('rent-budget')}</label>
                    <input
                      type="number"
                      className="form-input block w-full rounded-md border-gray-300"
                      min="100"
                      required
                      value={CLInfo.budget}
                      onChange={e => setCLInfo({ ...CLInfo, budget: e.target.value })}
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
                3. {t('financial-statement')}
              </button>
            </h2>
            <div
              className={`transition-all duration-500 ease-in-out max-h-0 overflow-hidden ${
                openAccordion === 3 ? 'max-h-screen opacity-100' : 'opacity-0'
              }`}
            >
              {openAccordion === 3 && (
                <div className="space-y-6 px-6 py-4">
                  <div>
                    <label className="block text-sm font-medium">{t('proof-of-funds')}</label>
                    <div className="space-y-2 mt-4">
                      {/* Render checkboxes dynamically */}
                      {financialStatementOpts.map(option => (
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
                4. {t('rental-history')}
              </button>
            </h2>

            <div
              className={`transition-all duration-500 ease-in-out max-h-0 overflow-hidden ${
                openAccordion === 4 ? 'max-h-screen opacity-100' : 'opacity-0'
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
                        checked={CLInfo.rentalHistory === 'first-time'}
                        onChange={handleRentalHistoryChange}
                        className="mr-2"
                      />
                      {t('first-time')}
                    </label>

                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="rentalHistory"
                        value="not-first-time"
                        checked={CLInfo.rentalHistory === 'not-first-time'}
                        onChange={handleRentalHistoryChange}
                        className="mr-2"
                      />
                      {t('not-first-time')}
                    </label>
                  </div>

                  {/* Additional Section for Previous Rental Experience */}
                  {CLInfo.rentalHistory === 'not-first-time' && (
                    <div className="mt-4 space-y-4 transition-all duration-500">
                      <label className="block text-sm font-medium">{t('rental-experience')}</label>

                      {/* Map through the rental history array */}
                      {CLInfo.previousExperiences.map((experience, index) => (
                        <div key={index} className="relative p-4 border rounded-md">
                          <textarea
                            className="form-input block w-full rounded-md border-gray-300 focus:outline-none focus:ring-0 focus:border-gray-300"
                            rows={3}
                            placeholder="Describe your previous rental experience. (Address, rental duration, rent, landlord reference letter.)"
                            value={experience}
                            onChange={e => handleExperienceChange(index, e.target.value)}
                          />
                          <button
                            className="absolute top-1 right-1 text-red-500"
                            onClick={() => removeExperience(index)}
                          >
                            {t('delete')}
                          </button>
                        </div>
                      ))}

                      {/* Add More Experience Button */}
                      <button
                        className="mt-2 px-4 py-2 bg-blue-primary text-white rounded-md"
                        onClick={addExperience}
                      >
                        {t('add-more-experience')}
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
                5. {t('background')}
              </button>
            </h2>
            <div
              className={`transition-all duration-500 ease-in-out max-h-0 overflow-hidden ${
                openAccordion === 5 ? 'max-h-screen opacity-100' : 'opacity-0'
              }`}
            >
              {openAccordion === 5 && (
                <div className="space-y-6 px-6 py-4">
                  <div>
                    <label className="block text-sm font-medium">{t('personality')}</label>
                    <div className="space-y-2 mt-4">
                      {/* Render checkboxes dynamically */}
                      {personalityOpts.map(option => (
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

                    <label className="block text-sm font-medium mt-3">{t('additional-info')}</label>
                    <div className="relative p-4 border rounded-md mt-3">
                      <textarea
                        className="form-input block w-full rounded-md border-gray-300 focus:outline-none focus:ring-0 focus:border-gray-300"
                        rows={3}
                        placeholder={t('additional-info-ph')}
                        value={CLInfo.bgInfo}
                        onChange={e => setCLInfo({ ...CLInfo, bgInfo: e.target.value })}
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
            <h2 className="text-xl font-semibold">
              <button
                className="w-full text-left py-3 px-4 bg-gray-100 rounded-md"
                onClick={() => toggleAccordion(7)}
              >
                1. {t('guarantor-info')}
              </button>
            </h2>
            <div
              className={`transition-all duration-500 ease-in-out max-h-0 overflow-hidden ${
                openAccordion === 7 ? 'max-h-screen opacity-100' : 'opacity-0'
              }`}
            >
              {openAccordion === 7 && (
                <div className="space-y-6 px-6 py-4">
                  <div className="font-semibold">
                    {/* Parent names */}
                    <div className="pb-4">
                      <div className="flex jusrify-between items-center mt-3 gap-3">
                        {/* Father */}
                        <div className="space-y-2 flex-1">
                          <div className="text-sm text-gray-600">{t('dad-name')}</div>
                          <textarea
                            className="flex border rounded px-2 py-1 max-h-40 overflow-y-auto w-full"
                            placeholder="e.g. Zhang Wei"
                            value={PLInfo.fatherName}
                            onChange={e =>
                              setPLInfo({
                                ...PLInfo,
                                fatherName: e.target.value,
                              })
                            }
                          />
                        </div>

                        {/* Mother */}
                        <div className="space-y-2 flex-1">
                          <div className="text-sm text-gray-600">{t('mom-name')}</div>
                          <textarea
                            className="flex border rounded px-2 py-1 max-h-40 overflow-y-auto w-full"
                            placeholder="e.g. Li Mei"
                            value={PLInfo.motherName}
                            onChange={e =>
                              setPLInfo({
                                ...PLInfo,
                                motherName: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="font-semibold">
                    {/* Parent tel */}
                    <div className="pb-4">
                      <div className="flex jusrify-between items-center mt-3 gap-3">
                        {/* Father tel */}
                        <div className="space-y-2 flex-1">
                          <div className="text-sm text-gray-600">{t('dad-tel')}</div>
                          <textarea
                            className="flex border rounded px-2 py-1 max-h-40 overflow-y-auto w-full"
                            placeholder="e.g. +86 138 xxxx xxxx"
                            value={PLInfo.fatherContactNum}
                            onChange={e =>
                              setPLInfo({
                                ...PLInfo,
                                fatherContactNum: e.target.value,
                              })
                            }
                          />
                        </div>

                        {/* Mother tel */}
                        <div className="space-y-2 flex-1">
                          <div className="text-sm text-gray-600">{t('mom-tel')}</div>
                          <textarea
                            className="flex border rounded px-2 py-1 max-h-40 overflow-y-auto w-full"
                            placeholder="e.g. +86 138 xxxx xxxx"
                            value={PLInfo.motherContactNum}
                            onChange={e =>
                              setPLInfo({
                                ...PLInfo,
                                motherContactNum: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="font-semibold">
                    <div className="pb-4">
                      <div className="flex jusrify-between items-center mt-3 gap-3">
                        {/* Contact email */}
                        <div className="space-y-2 flex-1">
                          <div className="text-sm text-gray-600">{t('email')}</div>
                          <textarea
                            className="flex border rounded px-2 py-1 max-h-40 overflow-y-auto w-full"
                            placeholder="e.g. parent@gmail.com"
                            value={PLInfo.contactEmail}
                            onChange={e =>
                              setPLInfo({
                                ...PLInfo,
                                contactEmail: e.target.value,
                              })
                            }
                          />
                        </div>

                        {/* name */}
                        <div className="space-y-2 flex-1">
                          <div className="text-sm text-gray-600">{t('student-name')}</div>
                          <textarea
                            className="flex border rounded px-2 py-1 max-h-40 overflow-y-auto w-full"
                            placeholder="e.g. Zhang Ming"
                            value={PLInfo.studentName}
                            onChange={e =>
                              setPLInfo({
                                ...PLInfo,
                                studentName: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="font-semibold">
                    <div className="pb-4">
                      <div className="flex jusrify-between items-center mt-3 gap-3">
                        {/* Father */}
                        <div className="space-y-2 flex-1">
                          <div className="text-sm text-gray-600">{t('home-address')}</div>
                          <textarea
                            className="flex border rounded px-2 py-1 max-h-40 overflow-y-auto w-full"
                            placeholder="e.g. No.123, XiDan Street, Beijing, China"
                            value={PLInfo.homeAddress}
                            onChange={e =>
                              setPLInfo({
                                ...PLInfo,
                                homeAddress: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Financial Support */}
          <div className="pb-1">
            <h2 className="text-xl font-semibold">
              <button
                className="w-full text-left py-3 px-4 bg-gray-100 rounded-md"
                onClick={() => toggleAccordion(8)}
              >
                2. {t('financial-support')}
              </button>
            </h2>
            <div
              className={`transition-all duration-500 ease-in-out max-h-0 overflow-hidden ${
                openAccordion === 8 ? 'max-h-screen opacity-100' : 'opacity-0'
              }`}
            >
              {openAccordion === 8 && (
                <div className="space-y-6 px-6 py-4">
                  <div>
                    <div className="font-semibold">
                      <div className="pb-4">
                        <div className="flex jusrify-between items-center mt-3 gap-3">
                          {/* Weekly Rent */}
                          <div className="space-y-2 flex-1">
                            <div className="text-sm text-gray-600">{t('weekly-rent')}</div>
                            <textarea
                              className="flex border rounded px-2 py-1 max-h-40 overflow-y-auto w-full"
                              placeholder="e.g. 300$"
                              value={PLInfo.weeklyRent}
                              onChange={e =>
                                setPLInfo({
                                  ...PLInfo,
                                  weeklyRent: e.target.value,
                                })
                              }
                            />
                          </div>

                          {/* livingExpenses */}
                          <div className="space-y-2 flex-1">
                            <div className="text-sm text-gray-600">{t('living-expen')}</div>
                            <textarea
                              className="flex border rounded px-2 py-1 max-h-40 overflow-y-auto w-full"
                              placeholder="e.g. 800$"
                              value={PLInfo.livingExpenses}
                              onChange={e =>
                                setPLInfo({
                                  ...PLInfo,
                                  livingExpenses: e.target.value,
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mt-4 font-semibold">
                    <div className="text-sm text-gray-600">{t('source-funds')}</div>
                    {sourceOfFundsOpts.map(option => (
                      <div key={option} className="flex items-center">
                        <input
                          type="checkbox"
                          id={option}
                          name="sourceOfFunds"
                          value={option}
                          checked={PLInfo.sourceOfFunds.includes(option)}
                          onChange={handleSourceFundsCheckboxChange}
                          className="mr-2"
                        />
                        <label htmlFor={option} className="text-sm">
                          {option}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Proof of Guarantor's Ability */}
          <div className="pb-1">
            <h2 className="text-xl font-semibold">
              <button
                className="w-full text-left py-3 px-4 bg-gray-100 rounded-md"
                onClick={() => toggleAccordion(9)}
              >
                3. {t('proof-guarantor-ability')}
              </button>
            </h2>
            <div
              className={`transition-all duration-500 ease-in-out max-h-0 overflow-hidden ${
                openAccordion === 9 ? 'max-h-screen opacity-100' : 'opacity-0'
              }`}
            >
              {openAccordion === 9 && (
                <div className="space-y-6 px-6 py-4">
                  <div>
                    <div className="font-semibold">
                      <div className="pb-4">
                        <div className="flex jusrify-between items-center mt-3 gap-3">
                          {/* account balance */}
                          <div className="space-y-2 flex-1">
                            <div className="text-sm text-gray-600">{t('account-balance')}</div>
                            <textarea
                              className="flex border rounded px-2 py-1 max-h-40 overflow-y-auto w-full"
                              placeholder="e.g. 500000"
                              value={PLInfo.accountBalance}
                              onChange={e =>
                                setPLInfo({
                                  ...PLInfo,
                                  accountBalance: e.target.value,
                                })
                              }
                            />
                          </div>

                          {/* annualIncome */}
                          <div className="space-y-2 flex-1">
                            <div className="text-sm text-gray-600">{t('annual-income')}</div>
                            <textarea
                              className="flex border rounded px-2 py-1 max-h-40 overflow-y-auto w-full"
                              placeholder="e.g. 300000"
                              value={PLInfo.annualIncome}
                              onChange={e =>
                                setPLInfo({
                                  ...PLInfo,
                                  annualIncome: e.target.value,
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mt-4 font-semibold">
                    <div className="text-sm text-gray-600">{t('proof-docs')}</div>
                    {proofDocsOpts.map(option => (
                      <div key={option} className="flex items-center">
                        <input
                          type="checkbox"
                          id={option}
                          name="proofDocs"
                          value={option}
                          checked={PLInfo.proofDocs.includes(option)}
                          onChange={handleProofDocsCheckboxChange}
                          className="mr-2"
                        />
                        <label htmlFor={option} className="text-sm">
                          {option}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Additional Commitment */}
          <div className="pb-1">
            <h2 className="text-xl font-semibold">
              <button
                className="w-full text-left py-3 px-4 bg-gray-100 rounded-md"
                onClick={() => toggleAccordion(10)}
              >
                4. {t('additional-commitment')}
              </button>
            </h2>
            <div
              className={`transition-all duration-500 ease-in-out max-h-0 overflow-hidden ${
                openAccordion === 10 ? 'max-h-screen opacity-100' : 'opacity-0'
              }`}
            >
              {openAccordion === 10 && (
                <div className="space-y-6 px-6 py-4">
                  <div className="font-semibold">
                    <div className="pb-4">
                      <div className="flex jusrify-between items-center mt-3 gap-3">
                        {/* Prepay Rent */}
                        <div className="space-y-2 flex-1">
                          <div className="text-sm text-gray-600">{t('willingness')}</div>
                          <select
                            className="flex border rounded px-2 py-1 max-h-40 overflow-y-auto w-full"
                            value={PLInfo.prepayRent}
                            onChange={e =>
                              setPLInfo({
                                ...PLInfo,
                                prepayRent: e.target.value,
                              })
                            }
                          >
                            <option>{t('no-prepayment')}</option>
                            <option>{t('pay-1-month')}</option>
                            <option>{t('pay-3-month')}</option>
                            <option>{t('pay-6-month')}</option>
                            <option>{t('pay-9-month')}</option>
                            <option>{t('pay-12-month')}</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mt-4">
                    <div className="text-sm text-gray-600 font-semibold">
                      {t('joint-liability')}
                    </div>
                    <input
                      type="checkbox"
                      value={PLInfo.liabilityStatement}
                      onChange={e =>
                        setPLInfo({
                          ...PLInfo,
                          liabilityStatement: e.target.value,
                        })
                      }
                      className="mr-2"
                    />
                    <label className="text-sm font-semibold">{t('will-joint-liability')}</label>
                    <div className="text-xs">{t('will-joint-msg')}</div>
                  </div>
                  <div className="space-y-2 mt-4">
                    {' '}
                    <label className="block text-sm font-medium mt-3">
                      {t('additional-commitment')}
                    </label>
                    <div className="relative p-4 border rounded-md mt-3">
                      <textarea
                        className="form-input block w-full rounded-md border-gray-300 focus:outline-none focus:ring-0 focus:border-gray-300"
                        rows={3}
                        placeholder={t('additional-commitment-ph')}
                        value={PLInfo.otherCommitments}
                        onChange={e =>
                          setPLInfo({
                            ...PLInfo,
                            otherCommitments: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LetterForm;
