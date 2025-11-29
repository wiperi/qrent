'use client';

import React, { useState } from 'react';

interface TodoItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

interface TodoProgressBarProps {
  items?: TodoItem[];
}

const TodoProgressBar: React.FC<TodoProgressBarProps> = ({ items }) => {
  const defaultItems: TodoItem[] = [
    {
      id: '1',
      title: '确定预算与区域',
      description: '已完成',
      completed: true
    },
    {
      id: '2',
      title: '寻找房源',
      description: '正在浏览各大平台房源信息',
      completed: false
    },
    {
      id: '3',
      title: '预约看房',
      description: '联系中介安排实地考察',
      completed: false
    },
    {
      id: '4',
      title: '提交申请',
      description: '准备材料并填写申请表',
      completed: false
    },
    {
      id: '5',
      title: '签订合同',
      description: '仔细阅读条款并签字',
      completed: false
    },
    {
      id: '6',
      title: '支付押金与租金',
      description: '完成首付款项支付',
      completed: false
    },
    {
      id: '7',
      title: '入住检查 (Condition Report)',
      description: '领取钥匙并核对房屋状况',
      completed: false
    }
  ];

  const [todoItems, setTodoItems] = useState<TodoItem[]>(items || defaultItems);

  const handleCheckboxClick = (id: string) => {
    setTodoItems(prevItems =>
      prevItems.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  return (
    <aside className="bg-white p-6 rounded-2xl sticky top-24 border border-gray-200">
      <div className="text-lg font-bold mb-6 pb-4 border-b border-gray-200 text-gray-900">
        租房进度表
      </div>
      <div className="flex flex-col relative">
        {/* 垂直时间线 */}
        <div className="absolute left-3 top-2.5 bottom-2.5 w-0.5 bg-gray-200 z-0"></div>
        
        {todoItems.map((item) => (
          <div 
            key={item.id} 
            className="flex gap-4 py-3 relative z-1 transition-all duration-800"
          >
            <div className="relative pt-0.5">
              <div 
                className={`w-6 h-6 rounded-md border-2 cursor-pointer flex items-center justify-center ${
                  item.completed 
                    ? 'bg-emerald-500 border-emerald-500 text-white' 
                    : item.id === '2' 
                      ? 'border-blue-600 shadow-md shadow-blue-100' 
                      : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
                onClick={() => handleCheckboxClick(item.id)}
              >
                {item.completed && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                )}
              </div>
            </div>
            <div className="flex-1 cursor-pointer">
              <div className={`text-sm font-semibold mb-1 ${
                item.completed 
                  ? 'text-gray-500 line-through' 
                  : 'text-gray-900'
              }`}>
                {item.title}
              </div>
              <div className="text-xs text-gray-500 leading-relaxed">
                {item.description}
              </div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default TodoProgressBar;