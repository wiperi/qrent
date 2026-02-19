// Assistant 浮窗状态管理：管理弹窗状态、消息同步与 UI 渲染。
'use client';

import { create } from 'zustand';

type FloatingAssistantState = {
  isOpen: boolean;
  unreadCount: number;
  lastMessageId: string | null;
  position: { x: number; y: number } | null;
  open: (lastMessageId?: string | null) => void;
  close: () => void;
  toggle: (lastMessageId?: string | null) => void;
  markRead: (lastMessageId?: string | null) => void;
  registerMessage: (messageId: string, isAssistant: boolean) => void;
  setPosition: (position: { x: number; y: number }) => void;
};

export const useFloatingAssistantStore = create<FloatingAssistantState>(set => ({
  isOpen: false,
  unreadCount: 0,
  lastMessageId: null,
  position: null,
  open: lastMessageId =>
    set(state => ({
      isOpen: true,
      unreadCount: 0,
      lastMessageId: lastMessageId ?? state.lastMessageId,
    })),
  close: () => set({ isOpen: false }),
  toggle: lastMessageId =>
    set(state => {
      const nextOpen = !state.isOpen;
      return {
        isOpen: nextOpen,
        unreadCount: nextOpen ? 0 : state.unreadCount,
        lastMessageId: nextOpen ? (lastMessageId ?? state.lastMessageId) : state.lastMessageId,
      };
    }),
  markRead: lastMessageId =>
    set(state => ({
      unreadCount: 0,
      lastMessageId: lastMessageId ?? state.lastMessageId,
    })),
  registerMessage: (messageId, isAssistant) =>
    set(state => {
      if (state.lastMessageId === messageId) return state;
      if (state.isOpen) {
        return { lastMessageId: messageId, unreadCount: 0 };
      }

      return {
        lastMessageId: messageId,
        unreadCount: isAssistant ? state.unreadCount + 1 : state.unreadCount,
      };
    }),
  setPosition: position => set({ position }),
}));
