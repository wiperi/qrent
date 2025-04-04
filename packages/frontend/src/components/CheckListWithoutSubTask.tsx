'use client';
import React from 'react';
import { motion } from 'framer-motion';
import {
  Book,
  FileText,
  CreditCard,
  Banknote,
  File,
  PenTool,
  Check,
  Newspaper,
} from 'lucide-react';
import { usePrepareDocProgressStore } from '../store/prepareDocProgressStore';

interface CheckListWithoutSubTaskProps {
  title: string;
  items: string[];
}

const CheckListWithoutSubTask: React.FC<CheckListWithoutSubTaskProps> = ({ title, items }) => {
  const iconMap = [
    <Book key="book" className="text-blue-primary" />,
    <FileText key="filetext" className="text-blue-primary" />,
    <CreditCard key="creditcard" className="text-blue-primary" />,
    <Banknote key="banknote" className="text-blue-primary" />,
    <Newspaper key="newspaper" className="text-blue-primary" />,
    <File key="file" className="text-blue-primary" />,
    <PenTool key="pentool" className="text-blue-primary" />,
  ];

  const { checkedTasks, updateProgress } = usePrepareDocProgressStore();
  const handleCheckboxChange = (task: string) => {
    const isChecked = !checkedTasks[task];
    updateProgress(task, isChecked);
  };

  const totalItems = items.length;
  const completedItems = Object.values(checkedTasks).filter(Boolean).length;
  const progress = (completedItems / totalItems) * 100;

  return (
    <div className="max-w-sm mx-auto p-2">
      {/* Header */}
      <h2 className="text-xl font-bold text-center mb-4">{title}</h2>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
        <motion.div
          className="bg-blue-primary h-3 rounded-full"
          initial={{ width: '0%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Completed Tasks Count */}
      <p className="text-center text-sm text-gray-600 mb-4">
        Completed {completedItems}/{totalItems} tasks
      </p>

      {/* Checklist */}
      {items.map((item, index) => (
        <div key={item} className="bg-gray-100 rounded-xl p-4 shadow-md mt-4 max-w-[300px]">
          <label className="flex items-center py-2">
            {/* Item text & icon (Left) */}
            <span className="text-md flex items-center space-x-2">
              {iconMap[index] || <span className="w-5 h-5 bg-gray-300 rounded-full"></span>}
              <span>{item}</span>
            </span>
            {/* Checkbox (Rightmost) */}
            <input
              type="checkbox"
              className="peer hidden"
              checked={checkedTasks[item] || false}
              onChange={() => handleCheckboxChange(item)}
            />
            <div className="w-6 h-6 ml-auto flex items-center justify-center rounded-md border border-gray-400 peer-checked:bg-blue-primary peer-checked:border-blue-primary transition">
              {checkedTasks[item] && <Check className="w-4 h-4 text-white" />}
            </div>
          </label>
        </div>
      ))}
    </div>
  );
};

export default CheckListWithoutSubTask;
