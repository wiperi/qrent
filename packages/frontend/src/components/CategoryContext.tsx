'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface CategoryContextType {
  selectedCategories: string[];
  setSelectedCategories: (categories: string[]) => void;
  toggleCategory: (category: string) => void;
  clearCategories: () => void;
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

export function CategoryProvider({ children }: { children: React.ReactNode }) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const toggleCategory = useCallback((category: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(c => c !== category);
      } else {
        return [...prev, category];
      }
    });
  }, []);

  const clearCategories = useCallback(() => {
    setSelectedCategories([]);
  }, []);

  return (
    <CategoryContext.Provider
      value={{
        selectedCategories,
        setSelectedCategories,
        toggleCategory,
        clearCategories,
      }}
    >
      {children}
    </CategoryContext.Provider>
  );
}

export function useCategory() {
  const context = useContext(CategoryContext);
  if (context === undefined) {
    throw new Error('useCategory must be used within a CategoryProvider');
  }
  return context;
}