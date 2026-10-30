'use client';

import React, { useState, useEffect, useId } from 'react';
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
  defaultCollapsed?: boolean;
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
  defaultCollapsed = false,
}) => {
  const locale = useLocale();
  const [todoItems, setTodoItems] = useState<TodoItem[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const panelId = useId();

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
      <button
        type="button"
        className="flex min-h-12 w-full items-center justify-between gap-4 rounded-2xl px-4 py-3 text-left hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600"
        aria-expanded={!isCollapsed}
        aria-controls={panelId}
        onClick={() => setIsCollapsed(value => !value)}
      >
        <span className="font-semibold text-slate-900">{headerText}</span>
        <span className="flex items-center gap-3 text-sm text-slate-500">
          {todoItems.filter(item => item.completed).length}/{todoItems.length}
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={isCollapsed ? '' : 'rotate-180'}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>
      <div id={panelId} hidden={isCollapsed} className="overflow-y-auto px-4 pb-3">
        {todoItems.map(item => (
          <label key={item.id} className="flex min-h-12 cursor-pointer items-start gap-3 py-3">
            <input
              type="checkbox"
              checked={item.completed}
              onChange={() => handleCheckboxClick(item.id)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-blue-600"
            />
            <span>
              <span
                className={`block text-sm font-medium ${item.completed ? 'text-slate-500 line-through' : item.id === firstIncompleteId ? 'text-blue-700' : 'text-slate-900'}`}
              >
                {item.title}
              </span>
              {item.description !== item.title && (
                <span className="mt-1 block text-xs leading-relaxed text-slate-500">
                  {item.description}
                </span>
              )}
            </span>
          </label>
        ))}
      </div>
    </aside>
  );
};

export default TodoProgressBar;
