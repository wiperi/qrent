"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const stepsData = [
  {
    title: "1. Understanding Rental Options",
    subtasks: [
      "Get to know shared housing pros and cons",
      "Understand whole property rentals",
      "Check if you're eligible for student accommodation",
      "Learn about private rentals and how they work",
    ],
  },
  {
    title: "2. Setting Your Rental Priorities",
    subtasks: [
      "Figure out your budget range",
      "Decide how far you're willing to commute",
      "List must-have amenities",
    ],
  },
  {
    title: "3. Researching Suburbs & Locations",
    subtasks: [
      "Look into different areas and their vibe",
      "Check out local shops, public transport, and safety",
      "Narrow down your preferred suburbs",
    ],
  },
  {
    title: "4. Finding the Right Rental Platforms",
    subtasks: [
      "Explore major rental websites",
      "Understand average rental prices in your chosen areas",
      "Read tenant reviews and experiences",
    ],
  },
  {
    title: "5. Getting Your Application Ready",
    subtasks: [
      "Organise necessary documents (ID, visa, proof of income)",
      "Make sure you have rental history or references",
      "Learn what to expect at property inspections",
    ],
  },
  {
    title: "6. Attending Inspections & Applying",
    subtasks: [
      "Book inspection appointments ASAP",
      "Communicate clearly with agents and landlords",
      "Take notes and photos of properties you visit",
      "Keep track of applications and responses",
    ],
  },
  {
    title: "7. Understanding Lease Agreements",
    subtasks: [
      "Read through a standard rental contract carefully",
      "Know the bond and deposit rules",
      "Check acceptable payment methods and due dates",
    ],
  },
  {
    title: "8. Moving In & Post-Rental Tasks",
    subtasks: [
      "Inspect the property and report any existing damage",
      "Set up electricity, water, and internet",
      "Set up utilities",
      "Understand maintenance requests and procedures",
    ],
  },
];

const CheckboxList: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [checkedTasks, setCheckedTasks] = useState<{ [key: string]: boolean }>(
    {}
  );

  // Toggle checkboxes and update progress
  const handleCheckboxChange = (task: string) => {
    setCheckedTasks((prev) => ({
      ...prev,
      [task]: !prev[task],
    }));
  };

  // Calculate progress
  const totalTasks = stepsData.reduce(
    (acc, step) => acc + step.subtasks.length,
    0
  );
  const completedTasks = Object.values(checkedTasks).filter(Boolean).length;
  const progress = (completedTasks / totalTasks) * 100;

  return (
    <div className="max-w-lg mx-auto p-5">
      {/* Header */}
      <h2 className="text-2xl font-bold text-center text-blue-primary mb-4">
        Rental Process
      </h2>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
        <motion.div
          className="bg-blue-primary h-3 rounded-full"
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Completed Tasks Count */}
      <p className="text-center text-sm text-gray-600 mb-6">
        Completed {completedTasks}/{totalTasks} tasks
      </p>

      {/* Checklist */}
      {stepsData.map((step, index) => (
        <div key={index} className="mb-4">
          <button
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            className="w-full p-3 text-blue-primary bg-gray-200 font-semibold rounded-lg hover:bg-gray-300 transition"
          >
            {step.title}
          </button>

          <AnimatePresence>
            {openIndex === index && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="mt-2 space-y-2 p-3 bg-gray-100 rounded-lg overflow-hidden"
              >
                {step.subtasks.map((task, i) => (
                  <label key={i} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      className="form-checkbox text-blue-primary"
                      checked={checkedTasks[task] || false}
                      onChange={() => handleCheckboxChange(task)}
                    />
                    <span className="text-morandi-blue">{task}</span>
                  </label>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
};

export default CheckboxList;
