import { create } from 'zustand';
import type { ChatReply, ModelConnection } from './contracts';
import type { ModelProvider } from './presets';

export type RentalTurn = { question: string; reply: ChatReply };

type RentalSession = {
  connection?: ModelConnection;
  turns: RentalTurn[];
  draft: string;
  panelVisited: boolean;
  settingsOpen: boolean;
  selectedProvider?: ModelProvider | 'local';
  keyDraft: string;
  pending: string;
  error: string;
  request?: AbortController;
  visitPanel: () => void;
  showSettings: (open: boolean) => void;
  selectProvider: (provider: ModelProvider | 'local') => void;
  setKeyDraft: (keyDraft: string) => void;
  setConnection: (connection: ModelConnection) => void;
  setDraft: (draft: string) => void;
  setError: (error: string) => void;
  beginTurn: (question: string) => AbortController | undefined;
  finishTurn: () => void;
  addTurn: (turn: RentalTurn) => void;
  clearTurns: () => void;
};

// Keep this tab's conversation and settings across the floating window and full page.
export const useRentalSession = create<RentalSession>((set, get) => ({
  turns: [],
  draft: '',
  panelVisited: false,
  settingsOpen: false,
  keyDraft: '',
  pending: '',
  error: '',
  visitPanel: () => set({ panelVisited: true }),
  showSettings: settingsOpen => set({ settingsOpen }),
  selectProvider: selectedProvider => set({ selectedProvider, keyDraft: '', error: '' }),
  setKeyDraft: keyDraft => set({ keyDraft }),
  setConnection: connection =>
    set({ connection, turns: [], keyDraft: '', error: '', settingsOpen: false }),
  setDraft: draft => set({ draft }),
  setError: error => set({ error }),
  beginTurn: pending => {
    if (get().request) return undefined;
    const request = new AbortController();
    set({ request, pending, draft: '', error: '' });
    return request;
  },
  finishTurn: () => set({ request: undefined, pending: '' }),
  addTurn: turn => set(state => ({ turns: [...state.turns.slice(-19), turn] })),
  clearTurns: () => set({ turns: [], draft: '' }),
}));
