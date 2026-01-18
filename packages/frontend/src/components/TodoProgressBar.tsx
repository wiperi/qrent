'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useLocale } from 'next-intl';

interface TodoItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  url?: string;
}

interface TodoProgressBarProps {
  items?: TodoItem[];
  useSticky?: boolean;
  maxHeight?: string;
}

const STORAGE_KEY = 'todo-progress-bar-completed';

// 双语待办事项数据
const DEFAULT_TODO_ITEMS_ZH: TodoItem[] = [
  {
    id: '1',
    title: '确定预算与区域',
    description: '确定预算与区域',
    completed: false,
  },
  {
    id: '2',
    title: '寻找房源',
    description: '浏览各大平台房源信息',
    completed: false,
  },
  {
    id: '3',
    title: '预约看房',
    description: '联系中介安排实地考察',
    completed: false,
  },
  {
    id: '4',
    title: '提交申请',
    description: '准备材料并填写申请表',
    completed: false,
  },
  {
    id: '5',
    title: '签订合同',
    description: '仔细阅读条款并签字',
    completed: false,
  },
  {
    id: '6',
    title: '支付押金与租金',
    description: '完成首付款项支付',
    completed: false,
  },
  {
    id: '7',
    title: '入住检查',
    description: '领取钥匙并核对房屋状况',
    completed: false,
  },
];

const DEFAULT_TODO_ITEMS_EN: TodoItem[] = [
  {
    id: '1',
    title: 'Set Budget & Area',
    description: 'Determine budget and preferred area',
    completed: false,
  },
  {
    id: '2',
    title: 'Find Properties',
    description: 'Browse property listings on various platforms',
    completed: false,
  },
  {
    id: '3',
    title: 'Schedule Viewings',
    description: 'Contact agents to arrange property inspections',
    completed: false,
  },
  {
    id: '4',
    title: 'Submit Application',
    description: 'Prepare documents and fill out application forms',
    completed: false,
  },
  {
    id: '5',
    title: 'Sign Contract',
    description: 'Carefully review terms and sign agreement',
    completed: false,
  },
  {
    id: '6',
    title: 'Pay Deposit & Rent',
    description: 'Complete initial payment for deposit and rent',
    completed: false,
  },
  {
    id: '7',
    title: 'Move-in Inspection',
    description: 'Collect keys and check property condition',
    completed: false,
  },
];

const TodoProgressBar: React.FC<TodoProgressBarProps> = ({
  items,
  useSticky = true,
  maxHeight = '1000px',
}) => {
  const locale = useLocale();
  const [todoItems, setTodoItems] = useState<TodoItem[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  // 从localStorage加载完成状态
  const loadCompletedStates = (): boolean[] => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.every(item => typeof item === 'boolean')) {
          return parsed;
        }
      }
    } catch (error) {
      console.error('Failed to load completed states:', error);
    }
    return [];
  };

  // 保存完成状态到localStorage
  const saveCompletedStates = (states: boolean[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(states));
    } catch (error) {
      console.error('Failed to save completed states:', error);
    }
  };

  // 在客户端挂载后设置isClient为true并加载数据
  useEffect(() => {
    setIsClient(true);

    // 根据语言选择对应的默认待办事项
    const defaultItems = locale === 'en' ? DEFAULT_TODO_ITEMS_EN : DEFAULT_TODO_ITEMS_ZH;

    // 使用默认items作为基础
    const baseItems = items && items.length > 0 ? items : defaultItems;

    // 从localStorage加载完成状态
    const completedStates = loadCompletedStates();

    // 如果localStorage中的状态数组长度与当前items不匹配，说明列表结构发生了变化
    if (completedStates.length !== baseItems.length) {
      // 重置localStorage，使用默认的未完成状态
      const newStates = new Array(baseItems.length).fill(false);
      saveCompletedStates(newStates);

      // 应用新的完成状态到items
      const itemsWithState = baseItems.map((item, index) => ({
        ...item,
        completed: newStates[index] || false,
      }));
      setTodoItems(itemsWithState);
    } else {
      // 应用保存的完成状态到items
      const itemsWithState = baseItems.map((item, index) => ({
        ...item,
        completed: completedStates[index] || false,
      }));
      setTodoItems(itemsWithState);
    }

    setIsLoading(false);
  }, [items, locale]);

  // 在电脑端默认折叠
  useEffect(() => {
    const isMediumOrLarger = window.matchMedia('(min-width: 960px)').matches;
    if (isMediumOrLarger) {
      setIsCollapsed(true);
    }
  }, []);

  // 保存完成状态到localStorage
  useEffect(() => {
    if (isClient && !isLoading && todoItems.length > 0) {
      const completedStates = todoItems.map(item => item.completed);
      saveCompletedStates(completedStates);
    }
  }, [todoItems, isClient, isLoading]);

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

  // 防止在客户端挂载前渲染，避免hydration错误
  if (!isClient || isLoading) {
    return null;
  }

  const headerText = locale === 'en' ? 'Rental Progress' : '租房进度表';

  return (
    <aside
      className={`bg-white rounded-2xl border border-gray-200 flex flex-col ${useSticky ? 'sticky top-24' : ''}`}
      style={maxHeight !== 'auto' ? { maxHeight: maxHeight } : {}}
    >
      {/* 标题栏 - 整个区域可点击触发折叠 */}
      <div
        ref={headerRef}
        className="flex items-center justify-between rounded-2xl p-3 transition-colors duration-200 select-none cursor-pointer hover:bg-gray-50"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="text-base font-bold text-gray-900 select-text">{headerText}</div>
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
        className={`transition-all duration-300  ${isCollapsed ? 'max-h-0' : 'flex-1'} px-6  overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full`}
      >
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
    </aside>
  );
};

export default TodoProgressBar;
