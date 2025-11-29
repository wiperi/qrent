'use client';

import React, { useState } from 'react';
import styles from './TodoProgressBar.module.css';

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

  const getCheckboxClass = (item: TodoItem) => {
    let className = styles.customCheckbox;
    if (item.completed) {
      className += ` ${styles.checked}`;
    } else if (item.id === '2') {
      className += ` ${styles.active}`;
    }
    return className;
  };

  return (
    <aside className={styles.guideSidebar}>
      <div className={styles.sidebarTitle}>租房进度表</div>
      <div className={styles.timelineList}>
        {todoItems.map((item) => (
          <div 
            key={item.id} 
            className={`${styles.timelineItem} ${item.completed ? styles.completed : ''}`}
          >
            <div className={styles.checkboxWrapper}>
              <div 
                className={getCheckboxClass(item)}
                onClick={() => handleCheckboxClick(item.id)}
              >
                {item.completed && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                )}
              </div>
            </div>
            <div className={styles.itemContent}>
              <div className={styles.itemTitle}>{item.title}</div>
              <div className={styles.itemDesc}>{item.description}</div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default TodoProgressBar;