import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useUserStore = create()(
  persist(
    set => ({
      userInfo: null,
      setUser: userInfo => set({ userInfo }),
      clearUser: () => set({ userInfo: null }),
    }),
    {
      name: 'user-info', // Name for localStorage
      storage: createJSONStorage(() => localStorage),
    }
  )
);
