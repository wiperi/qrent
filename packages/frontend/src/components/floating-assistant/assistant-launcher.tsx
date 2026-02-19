// Assistant 浮窗启动按钮：点击打开/关闭弹窗。
"use client";

import { X } from "lucide-react";
import type { FC } from "react";

import { cn } from "@/lib/utils";

type AssistantLauncherProps = {
  isOpen: boolean;
  unreadCount: number;
  onToggle: () => void;
};

export const AssistantLauncher: FC<AssistantLauncherProps> = ({
  isOpen,
  unreadCount,
  onToggle,
}) => {
  const badgeLabel = unreadCount > 9 ? "9+" : unreadCount.toString();

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "fixed z-[101] flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-transform duration-150",
        "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground",
        "hover:scale-105 active:scale-95",
        "bottom-6 right-6 md:bottom-8 md:right-8",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      )}
      aria-label={isOpen ? "Close assistant" : "Open assistant"}
    >
      <span className="text-xl leading-none">
        {isOpen ? <X className="h-5 w-5" aria-hidden /> : "💬"}
      </span>

      {unreadCount > 0 && !isOpen && (
        <span
          className="absolute -right-1 -top-1 flex min-h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-semibold text-white shadow-md"
          aria-label={`${unreadCount} unread messages`}
        >
          {badgeLabel}
        </span>
      )}
    </button>
  );
};
