"use client";

import React, { useState, useEffect } from 'react';

interface TodoItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  url?: string;
}

interface TodoProgressBarProps {
  items?: TodoItem[];
}

const STORAGE_KEY = 'todo-progress-bar-items';

const TodoProgressBar: React.FC<TodoProgressBarProps> = ({ items }) => {
  const defaultItems: TodoItem[] = [
    {
      id: '1',
      title: '确定预算与区域',
      description: '已完成',
      completed: false,
      url: '/budget'
    },
    {
      id: '2',
      title: '寻找房源',
      description: '正在浏览各大平台房源信息',
      completed: false,
      url: '/search'
    },
    {
      id: '3',
      title: '预约看房',
      description: '联系中介安排实地考察',
      completed: false,
      url: '/viewing'
    },
    {
      id: '4',
      title: '提交申请',
      description: '准备材料并填写申请表',
      completed: false,
      url: '/application'
    },
    {
      id: '5',
      title: '签订合同',
      description: '仔细阅读条款并签字',
      completed: false,
      url: '/contract'
    },
    {
      id: '6',
      title: '支付押金与租金',
      description: '完成首付款项支付',
      completed: false,
      url: '/payment'
    },
    {
      id: '7',
      title: '入住检查 (Condition Report)',
      description: '领取钥匙并核对房屋状况',
      completed: false,
      url: '/inspection'
    },
  ];

  const [todoItems, setTodoItems] = useState<TodoItem[]>(() => {
    // 从localStorage读取保存的数据
    if (typeof window !== 'undefined') {
      const savedItems = localStorage.getItem(STORAGE_KEY);
      if (savedItems) {
        try {
          return JSON.parse(savedItems);
        } catch (error) {
          console.error('Failed to parse saved todo items:', error);
        }
      }
    }
    return items || defaultItems;
  });

  const [isCollapsed, setIsCollapsed] = useState(false);

  // 保存数据到localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todoItems));
    }
  }, [todoItems]);

  const handleCheckboxClick = (id: string) => {
    setTodoItems(prevItems =>
      prevItems.map(item => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  };

  // 找到第一个未完成的项作为当前进行中的项
  const getFirstIncompleteItemId = () => {
    const incompleteItem = todoItems.find(item => !item.completed);
    return incompleteItem ? incompleteItem.id : null;
  };

  const firstIncompleteId = getFirstIncompleteItemId();

  return (
    <aside className="bg-white rounded-2xl sticky top-24 border border-gray-200">
      {/* 标题栏 - 整个区域可点击触发折叠 */}
      <div
        className="flex items-center justify-between cursor-pointer rounded-2xl p-3 hover:bg-gray-50 transition-colors duration-200 select-none"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="text-base font-bold text-gray-900 select-text">租房进度表</div>
        <div className="p-1 rounded-md hover:bg-gray-200 transition-colors duration-200">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`transform transition-transform duration-200 ${
              isCollapsed ? 'rotate-180' : ''
            }`}
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>

      {/* 内容区域 - 可折叠 */}
      <div
        className={`transition-all duration-300 overflow-hidden ${
          isCollapsed ? 'max-h-0' : 'max-h-[1000px]'
        }`}
      >
        <div className="p-6 pt-4">
          <div className="flex flex-col relative">
            {/* 垂直时间线 */}
            <div className="absolute left-3 top-2.5 bottom-2.5 w-0.5 bg-gray-200 z-0"></div>

            {todoItems.map(item => (
              <div key={item.id} className="flex gap-4 py-3 relative z-1">
                <div className="relative pt-0.5">
                  <div
                    className={`w-6 h-6 rounded-md border-2 cursor-pointer flex items-center justify-center transition-all duration-200 ${
                      item.completed
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : item.id === firstIncompleteId
                          ? 'border-blue-600 shadow-md bg-white  shadow-blue-100'
                          : 'border-gray-300 bg-white hover:border-gray-400'
                    }`}
                    onClick={() => handleCheckboxClick(item.id)}
                  >
                    {item.completed && (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    )}
                  </div>
                </div>
                <div className="flex-1 cursor-pointer">
                  <div
                    className={`text-sm font-semibold mb-1 ${
                      item.completed ? 'text-gray-500 line-through' : 'text-gray-900'
                    }`}
                  >
                    {item.title}
                  </div>
                  <div className="text-xs text-gray-500 leading-relaxed">{item.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default TodoProgressBar;