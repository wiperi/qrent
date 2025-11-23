import { create } from 'zustand';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIChatState {
  // UI state
  isOpen: boolean;
  width: number; // Width in percentage (30 by default)

  // Chat state
  messages: Message[];
  isLoading: boolean;

  // Actions
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  setWidth: (width: number) => void;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
  setLoading: (isLoading: boolean) => void;
}

export const useAIChatStore = create<AIChatState>(set => ({
  // Initial state
  isOpen: true,
  width: 30, // 30% of screen width
  messages: [],
  isLoading: false,

  // Actions
  openChat: () => set({ isOpen: true }),
  closeChat: () => set({ isOpen: false }),
  toggleChat: () => set(state => ({ isOpen: !state.isOpen })),
  setWidth: (width: number) => set({ width: Math.min(Math.max(width, 20), 60) }), // Clamp between 20-60%
  addMessage: message =>
    set(state => ({
      messages: [
        ...state.messages,
        {
          ...message,
          id: Math.random().toString(36).substr(2, 9),
          timestamp: new Date(),
        },
      ],
    })),
  clearMessages: () => set({ messages: [] }),
  setLoading: (isLoading: boolean) => set({ isLoading }),
}));
