import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Create the store
export const usePrepareDocProgressStore = create()(
  persist(
    (set, get) => ({
      checkedTasks: {}, // Store individual checkbox states (task name or ID -> true/false)
      checkedItem: 0, // Total count of checked items
      updateProgress: (task, increment) => {
        const checkedTasks = get().checkedTasks;
        const newCheckedTasks = { ...checkedTasks, [task]: increment }; // Update the specific task
        const newCheckedItem = get().checkedItem + (increment ? 1 : -1);
        set({
          checkedTasks: newCheckedTasks,
          checkedItem: newCheckedItem,
        });
      },
    }),
    {
      name: 'prepare-doc-progress', // Unique name for the progress storage
      storage: createJSONStorage(() => sessionStorage), // Using sessionStorage for progress persistence
    }
  )
);
