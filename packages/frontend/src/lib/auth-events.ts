import { useEffect } from 'react';

// 认证事件类型
type AuthModalType = 'login' | 'signup';

type AuthEventHandler = (modalType: AuthModalType) => void;

class AuthEventManager {
  private handlers: AuthEventHandler[] = [];

  subscribe(handler: AuthEventHandler): () => void {
    this.handlers.push(handler);
    return () => {
      const index = this.handlers.indexOf(handler);
      if (index > -1) {
        this.handlers.splice(index, 1);
      }
    };
  }

  emit(modalType: AuthModalType): void {
    this.handlers.forEach(handler => handler(modalType));
  }
}

export const authEventManager = new AuthEventManager();

// 打开登录弹窗的全局函数
export const showLoginModal = () => {
  authEventManager.emit('login');
};

// 打开注册弹窗的全局函数
export const showSignupModal = () => {
  authEventManager.emit('signup');
};

// Hook 用于监听全局认证事件
export const useAuthModalEvents = (onOpen: (modalType: AuthModalType) => void) => {
  useEffect(() => {
    const unsubscribe = authEventManager.subscribe(onOpen);
    return unsubscribe;
  }, [onOpen]);
};
