'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRentalGuideProgressStore } from '../store/rentalGuideProgressStore';
import { useTranslations } from 'next-intl';

interface ChecklistProps {
  title: string;
  stepsData: {
    title: string;
    subtasks: string[];
  }[];
}

const Checklist: React.FC<ChecklistProps> = ({ title, stepsData }) => {
  const t = useTranslations('CheckList');

  const { checkedTasks, updateProgress } = useRentalGuideProgressStore();

  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const handleCheckboxChange = (task: string) => {
    const isChecked = !checkedTasks[task];
    updateProgress(task, isChecked); // Update progress based on checkbox status
  };

  const totalTasks = stepsData.reduce((acc, step) => acc + step.subtasks.length, 0);
  const checkedItems = Object.values(checkedTasks).filter(Boolean).length;
  const progress = (checkedItems / totalTasks) * 100;

  return (
    <div className="max-w-lg mx-auto p-5 sticky">
      {/* Header */}
      <h2 className="text-2xl font-bold text-left text-blue-primary mb-4">{title}</h2>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
        <motion.div
          className="bg-blue-primary h-3 rounded-full"
          initial={{ width: '0%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Completed Tasks Count */}
      <p className="text-center text-sm text-gray-600 mb-6">
        Completed {checkedItems}/{totalTasks} tasks
      </p>

      {/* Checklist */}
      {stepsData.map((step, index) => {
        const match = step.title.match(/(.+?)（(.+?)）/); // Extract text before and inside parentheses
        const mainTitle = match ? match[1] : step.title;
        const subTitle = match ? match[2] : '';

        return (
          <div key={index} className="mb-4">
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="w-full p-3 text-blue-primary bg-gray-200 font-semibold rounded-lg hover:bg-gray-300 transition"
            >
              {mainTitle}
              {subTitle && <br />}
              {subTitle && <span className="text-sm text-gray-500">{subTitle}</span>}
            </button>

            <AnimatePresence>
              {openIndex === index && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="mt-2 space-y-2 p-3 bg-gray-100 rounded-lg overflow-hidden"
                >
                  {step.subtasks.map((task, i) => (
                    <label key={i} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        className="form-checkbox text-blue-primary"
                        checked={checkedTasks[task] || false}
                        onChange={() => handleCheckboxChange(task)} // Toggle checkbox
                      />
                      <span className="text-morandi-blue">{task}</span>
                    </label>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};

export default Checklist;
