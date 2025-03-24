'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Step {
  title: string;
  subtasks: string[];
}

interface ChecklistProps {
  title: string;
  stepsData: Step[];
}

const Checklist: React.FC<ChecklistProps> = ({ title, stepsData }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [checkedTasks, setCheckedTasks] = useState<{ [key: string]: boolean }>({});

  const handleCheckboxChange = (task: string) => {
    setCheckedTasks(prev => ({
      ...prev,
      [task]: !prev[task],
    }));
  };

  const totalTasks = stepsData.reduce((acc, step) => acc + step.subtasks.length, 0);
  const completedTasks = Object.values(checkedTasks).filter(Boolean).length;
  const progress = (completedTasks / totalTasks) * 100;

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

export default Checklist;
