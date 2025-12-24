import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider
// Toast 弹窗容器 - 固定在页面右上角，最大高度为屏幕高度，宽度为420px
const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 right-0 z-[100] flex max-h-screen w-full flex-col gap-3 p-4 max-w-[420px]",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

// Toast 样式变体 - 不同状态对应不同颜色
const toastVariants = {
  default: "border-slate-200 bg-white text-slate-900 shadow-lg",
  destructive: "border-red-200 bg-red-50 text-red-900 shadow-lg",
  success: "border-green-200 bg-green-50 text-green-900 shadow-lg",
  warning: "border-amber-200 bg-amber-50 text-amber-900 shadow-lg",
}

// Toast 弹窗 - 包含标题、描述和关闭按钮
const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & {
    variant?: 'default' | 'destructive' | 'success' | 'warning'
    duration?: number
    isClosing?: boolean
  }
>(({ className, variant = 'default', duration, isClosing, ...props }, ref) => {
  // 基础样式 - 布局、外观、过渡效果
  const baseStyles = [
    "group pointer-events-auto relative flex w-full items-center justify-between",
    "space-x-4 overflow-hidden rounded-lg border p-2 pr-12 transition-all"
  ].join(" ");

  // 滑动交互状态样式
  const swipeStyles = [
    // 取消滑动时的位置
    "data-[swipe=cancel]:translate-x-0",
    // 滑动结束时的位置（使用 CSS 变量）
    "data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]",
    // 滑动过程中的位置
    "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none"
  ].join(" ");

  // 动画状态样式
  const animationStyles = [
    // 打开和关闭状态的基础动画
    "data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out",
    // 向上滑入滑出动画
    "data-[state=open]:slide-in-from-bottom-full data-[state=closed]:slide-out-to-top-full"
  ].join(" ");

  return (
    <ToastPrimitives.Root
      ref={ref}
      duration={duration}
      open={!isClosing}  // 当正在关闭时，设置为关闭状态以触发动画
      className={cn(
        baseStyles,
        swipeStyles,
        animationStyles,
        toastVariants[variant],
        className
      )}
      {...props}
    />
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

// Toast 关闭按钮 - 移动端始终可见，桌面端hover显示
const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-current opacity-70 transition-opacity",
      "hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-current focus:ring-offset-2",
      "group-hover:opacity-100",
      "md:opacity-0 md:group-hover:opacity-100", // 移动端始终可见，桌面端hover显示
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

// Toast 标题
const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-semibold", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

// Toast 描述文字
const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-sm opacity-90", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
}