import { create } from 'zustand';
import { searchRentalLibrary } from '../rental-library-search';
import type { ChatReply, ModelConnection } from './contracts';
import type { ModelProvider } from './presets';

export type RentalTurn = { id: string; question: string; reply: ChatReply };

// Carry recent user facts and one relevant older turn. Old listing figures and
// citation IDs expire with the turn that produced them.
export function rentalContextMessages(turns: RentalTurn[], question: string) {
  const recent = turns.slice(-3);
  const older = searchRentalLibrary(
    turns.slice(0, -3).map(turn => ({
      title: turn.question,
      keywords: '',
      searchText: '',
      turn,
    })),
    question,
    1
  )[0]?.turn;
  const messages: { role: 'user' | 'assistant'; content: string }[] = older
    ? [{ role: 'user', content: older.question.slice(0, 1000) }]
    : [];
  for (const [index, turn] of recent.entries()) {
    messages.push({ role: 'user', content: turn.question.slice(0, 1000) });
    if (index === 0 || turn.reply.evidence.some(item => item.kind === 'listings')) continue;
    const answer = turn.reply.answer
      .replace(/\s*\[[RG]\d+\]/g, '')
      .trim()
      .slice(0, 900);
    if (answer) messages.push({ role: 'assistant', content: answer });
  }
  return [...messages, { role: 'user' as const, content: question }];
}

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
  sessionId?: string;
  visitPanel: () => void;
  showSettings: (open: boolean) => void;
  selectProvider: (provider: ModelProvider | 'local') => void;
  setKeyDraft: (keyDraft: string) => void;
  setConnection: (connection: ModelConnection) => void;
  setDraft: (draft: string) => void;
  setError: (error: string) => void;
  beginTurn: (question: string) => { controller: AbortController; sessionId: string } | undefined;
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
    set({
      connection,
      turns: [],
      sessionId: undefined,
      keyDraft: '',
      error: '',
      settingsOpen: false,
    }),
  setDraft: draft => set({ draft }),
  setError: error => set({ error }),
  beginTurn: pending => {
    const current = get();
    if (current.request) return undefined;
    const controller = new AbortController();
    const sessionId = current.sessionId ?? crypto.randomUUID();
    set({ request: controller, sessionId, pending, draft: '', error: '' });
    return { controller, sessionId };
  },
  finishTurn: () => set({ request: undefined, pending: '' }),
  addTurn: turn => set(state => ({ turns: [...state.turns.slice(-19), turn] })),
  clearTurns: () => set({ turns: [], sessionId: undefined, draft: '' }),
}));
