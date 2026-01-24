import * as React from 'react';

interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success' | 'warning';
  duration?: number;
  isClosing?: boolean; // 标记是否正在关闭，用于触发动画
}

interface ToastState {
  toasts: Toast[];
}

class ToastManager {
  private listeners: Array<(state: ToastState) => void> = [];
  private state: ToastState = { toasts: [] };
  private counter = 0;

  private generateId(): string {
    return (++this.counter).toString();
  }

  private emit() {
    this.listeners.forEach(listener => listener(this.state));
  }

  subscribe(listener: (state: ToastState) => void) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  show(toast: Omit<Toast, 'id'>) {
    const id = this.generateId();
    const newToast = { ...toast, id };

    this.state = { toasts: [...this.state.toasts, newToast] };
    this.emit();

    // Auto dismiss after duration
    const duration = toast.duration || 3000;
    setTimeout(() => {
      this.dismiss(id);
    }, duration);

    return id;
  }

  dismiss(id: string, animated = true) {
    if (animated) {
      // 动画关闭：先标记为关闭状态，等待动画完成后再移除
      const toastToDismiss = this.state.toasts.find(t => t.id === id);
      if (toastToDismiss) {
        // 标记为正在关闭
        this.state = {
          toasts: this.state.toasts.map(t => (t.id === id ? { ...t, isClosing: true } : t)),
        };
        this.emit();

        // 300ms 后真正移除（动画持续时间）
        setTimeout(() => {
          this.state = { toasts: this.state.toasts.filter(t => t.id !== id) };
          this.emit();
        }, 300);
      }
    } else {
      // 立即关闭：直接移除
      this.state = { toasts: this.state.toasts.filter(t => t.id !== id) };
      this.emit();
    }
  }

  dismissAll() {
    this.state = { toasts: [] };
    this.emit();
  }
}

export const toastManager = new ToastManager();

export function useToast() {
  const [state, setState] = React.useState<ToastState>({ toasts: [] });

  React.useEffect(() => {
    return toastManager.subscribe(setState);
  }, []);

  return {
    toasts: state.toasts,
    toast: (toast: Omit<Toast, 'id'>) => toastManager.show(toast),
    dismiss: (id: string) => toastManager.dismiss(id),
    dismissAll: () => toastManager.dismissAll(),
  };
}
