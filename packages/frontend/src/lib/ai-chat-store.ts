import { create } from 'zustand';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const WELCOME_MESSAGE: Message = {
  id: 'welcome-message',
  role: 'assistant',
  content:
    "🏠 Welcome to QRent! I've studied hundreds of high-quality rental guides and insights from students who've been through the process. The rental process in Australia typically includes: 🔍 searching for properties → 📅 booking viewings → 📄 preparing documents → 🏃 submitting applications on viewing day → 💰 paying deposit → 🔑 moving in. Tell me which stage you're at and what you need, and I'll help you make the right choice and find your dream home!\n\n🏠 欢迎来到QRent！我总结了数百篇高质量的租房攻略和学长学姐们的租房心得。澳洲的租房流程大致如下：🔍 选房 → 📅 预约看房 → 📄 准备文书 → 🏃 看房当天提交申请 → 💰 交押金 → 🔑 准备入住。告诉我你处于哪个环节和你的需求，让我来帮助你做出正确选择，租到你的下一个dream home！",
  timestamp: new Date('2024-01-01T00:00:00Z'),
};

interface AIChatState {
  // UI state
  isOpen: boolean;

  // Chat state
  messages: Message[];
  isLoading: boolean;

  // Actions
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
  setLoading: (isLoading: boolean) => void;
}

export const useAIChatStore = create<AIChatState>(set => ({
  isOpen: false,
  messages: [WELCOME_MESSAGE],
  isLoading: false,

  // Actions
  openChat: () => set({ isOpen: true }),
  closeChat: () => set({ isOpen: false }),
  toggleChat: () => set(state => ({ isOpen: !state.isOpen })),
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
