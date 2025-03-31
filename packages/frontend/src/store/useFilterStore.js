import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Create a store for filter management
export const useFilterStore = create()(
  persist(
    (set, get) => ({
      filter: {
        university: 'Any',
        priceMin: 'Any',
        priceMax: 'Any',
        travelTime: 'Any',
        bedroomMin: 'Any',
        bedroomMax: 'Any',
        bathroomMin: 'Any',
        bathroomMax: 'Any',
        propertyType: 'Any',
        area: 'Any',
        rate: 13,
        avaliableDate: 'Any',
      },
      updateFilter: newFilter => {
        set({ filter: { ...get().filter, ...newFilter } });
      },
    }),
    {
      name: 'filter-progress', // Unique name for the filter state storage
      storage: createJSONStorage(() => sessionStorage), // Using sessionStorage for persistence
    }
  )
);
