import { create } from 'zustand';
import type { ChatReply, ModelConnection } from './contracts';

export type RentalTurn = { question: string; reply: ChatReply };

type RentalSession = {
  connection?: ModelConnection;
  turns: RentalTurn[];
  draft: string;
  setConnection: (connection: ModelConnection) => void;
  setDraft: (draft: string) => void;
  addTurn: (turn: RentalTurn) => void;
  clearTurns: () => void;
};

// Keep this tab's conversation across the floating window and full page.
export const useRentalSession = create<RentalSession>(set => ({
  turns: [],
  draft: '',
  setConnection: connection => set({ connection, turns: [] }),
  setDraft: draft => set({ draft }),
  addTurn: turn => set(state => ({ turns: [...state.turns.slice(-19), turn] })),
  clearTurns: () => set({ turns: [], draft: '' }),
}));
