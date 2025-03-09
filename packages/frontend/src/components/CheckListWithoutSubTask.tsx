"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";

interface CheckListWithoutSubTaskProps {
  title: string;
  items: string[];
}

const CheckListWithoutSubTask: React.FC<CheckListWithoutSubTaskProps> = ({
  title,
  items,
}) => {
  const [checkedItems, setCheckedItems] = useState<{ [key: string]: boolean }>(
    {}
  );

  const handleCheckboxChange = (item: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [item]: !prev[item],
    }));
  };

  const totalItems = items.length;
  const completedItems = Object.values(checkedItems).filter(Boolean).length;
  const progress = (completedItems / totalItems) * 100;

  return (
    <div className="max-w-lg mx-auto p-5">
      {/* Header */}
      <h2 className="text-xl font-bold text-center mb-4">{title}</h2>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
        <motion.div
          className="bg-blue-primary h-3 rounded-full"
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Completed Tasks Count */}
      <p className="text-center text-sm text-gray-600 mb-4">
        Completed {completedItems}/{totalItems} tasks
      </p>

      {/* Checklist */}
      <div className="space-y-2">
        {items.map((item, index) => (
          <label key={index} className="flex items-center space-x-2">
            <input
              type="checkbox"
              className="form-checkbox"
              checked={checkedItems[item] || false}
              onChange={() => handleCheckboxChange(item)}
            />
            <span>{item}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default CheckListWithoutSubTask;
