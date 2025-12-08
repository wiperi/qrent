'use client';

import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
interface TimelineStep {
  id: string;
  label: string;
  name: string;
  completed: boolean;
  url?: string;
}

const STORAGE_KEY = 'todo-progress-bar-items';

export default function TodoProgressBar2() {
  const router = useRouter();
  const timelineRef = useRef<HTMLDivElement>(null);
  const [scrollWidth, setScrollWidth] = useState(0);

  useEffect(() => {
    const updateScrollWidth = () => {
      if (timelineRef.current) {
        setScrollWidth(timelineRef.current.scrollWidth);
      }
    };

    updateScrollWidth();
    window.addEventListener('resize', updateScrollWidth);

    return () => window.removeEventListener('resize', updateScrollWidth);
  }, []);

  const steps: TimelineStep[] = [
    { id: '1', label: '进行中', name: '确定预算与区域', completed: false, url: '/budget' },
    { id: '2', label: '下一步', name: '寻找房源', completed: false, url: '/search' },
    { id: '3', label: '待办', name: '预约看房', completed: false, url: '/viewing' },
    { id: '4', label: '待办', name: '提交申请', completed: false, url: '/application' },
    { id: '5', label: '待办', name: '签约合同', completed: false, url: '/contract' },
    { id: '6', label: '待办', name: '支付押金', completed: false, url: '/payment' },
    { id: '7', label: '待办', name: '入住准备', completed: false, url: '/inspection' },
  ];

  // 获取当前状态
  const getStepStatus = (step: TimelineStep, index: number) => {
    if (step.completed) {
      return 'completed';
    }

    const firstIncompleteIndex = steps.findIndex(s => !s.completed);
    if (index === firstIncompleteIndex) {
      return 'active';
    } else if (index === firstIncompleteIndex + 1) {
      return 'next';
    } else {
      return 'future';
    }
  };

  // 处理圆圈点击
  const handleStepClick = (step: TimelineStep) => {
    if (step.url) {
      router.push(step.url);
    }
  };

  // 处理查看详情点击：跳转到第一个未完成步骤的 URL
  const handleViewDetails = (e: React.MouseEvent) => {
    e.preventDefault();
    const firstIncompleteStep = steps.find(s => !s.completed);
    if (firstIncompleteStep?.url) {
      router.push(firstIncompleteStep.url);
    }
  };

  // 使用React语法简化类名获取
  const StepDot = ({ status }: { status: string }) => {
    const baseClasses = 'w-4 h-4 rounded-full border-2 flex-shrink-0';

    const statusClasses = {
      completed: 'bg-green-500 border-gray-100',
      active: 'bg-blue-600 border-gray-100',
      next: 'bg-white border-blue-600',
      future: 'bg-gray-300 border-gray-100',
    };

    return (
      <div className={`${baseClasses} ${statusClasses[status as keyof typeof statusClasses]}`} />
    );
  };

  const StepLabel = ({ status, children }: { status: string; children: React.ReactNode }) => {
    const baseClasses = 'text-xs font-semibold relative top-[-16px]';

    const statusClasses = {
      completed: 'text-green-600',
      active: 'text-blue-600',
      next: 'text-blue-600',
      future: 'text-gray-500',
    };

    return (
      <span className={`${baseClasses} ${statusClasses[status as keyof typeof statusClasses]}`}>
        {children}
      </span>
    );
  };

  const StepName = ({ status, children }: { status: string; children: React.ReactNode }) => {
    const nameClasses =
      status === 'future'
        ? 'text-sm font-medium text-gray-400 line-clamp-2'
        : 'text-sm font-medium text-gray-900 line-clamp-2';

    return <span className={nameClasses}>{children}</span>;
  };

  return (
    <div className="w-full md:w-60 bg-gray-100 rounded-3xl p-4 flex flex-col md:flex-col hover:bg-gray-200 transition-colors">
      {/* 标题栏 */}
      <div className="flex  flex-wrap justify-between  min-w-[80px] select-text">
        <span className="text-base font-bold text-gray-900">租房进度</span>
        <span
          className="text-xs text-blue-600 font-semibold cursor-pointer hover:text-blue-700 md:mt-1"
          onClick={handleViewDetails}
        >
          查看详情 →
        </span>
      </div>

      {/* 时间线步骤 - 响应式布局 */}
      <div ref={timelineRef} className="flex flex-row md:flex-col items-start md:items-start gap-4 md:gap-3 flex-1 relative pt-4 pl-0 md:pl-2 overflow-y-scroll md:overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full">
        {/* 水平线 - 移动端 */}
        <div
          className="md:hidden absolute left-0 top-6 h-0.5 bg-gray-300 z-0 transform -translate-y-1/2"
          style={{ width: `${scrollWidth * 0.95}px` }}
        ></div>

        {/* 垂直线 - 桌面端 */}
        <div className="hidden md:block absolute left-3.75 top-2 bottom-2 w-0.5 bg-gray-300 z-0 "></div>

        {steps.map((step, index) => {
          const status = getStepStatus(step, index);
          return (
            <div key={step.id} className="flex items-start gap-3 relative z-10 min-w-[120px]">
              {/* 步骤点 */}
              <div className="flex-shrink-0 relative">
                <StepDot status={status} />
              </div>

              {/* 步骤信息 */}
              <div className="flex flex-col items-start gap-0 flex-1">
                <StepLabel status={status}>{step.label}</StepLabel>
                <StepName status={status}>{step.name}</StepName>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
