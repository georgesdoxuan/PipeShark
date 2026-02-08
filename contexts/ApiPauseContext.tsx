'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface ApiPauseContextType {
  isPaused: boolean;
  togglePause: () => void;
}

const ApiPauseContext = createContext<ApiPauseContextType | undefined>(undefined);

export function ApiPauseProvider({ children }: { children: ReactNode }) {
  const [isPaused, setIsPaused] = useState(false);

  const togglePause = () => {
    setIsPaused((prev) => !prev);
  };

  return (
    <ApiPauseContext.Provider value={{ isPaused, togglePause }}>
      {children}
    </ApiPauseContext.Provider>
  );
}

export function useApiPause() {
  const context = useContext(ApiPauseContext);
  if (context === undefined) {
    throw new Error('useApiPause must be used within an ApiPauseProvider');
  }
  return context;
}
