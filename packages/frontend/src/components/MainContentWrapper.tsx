/**
 * 主内容布局包装器
 * 当 AI 聊天框打开时自动调整页面布局，桌面端添加右侧边距避免内容被遮挡，移动端无需调整（聊天框为全屏覆盖）
 */
'use client';

export function MainContentWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div>
      {children}
    </div>
  );
}
