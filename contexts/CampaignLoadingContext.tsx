'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface CampaignLoadingContextType {
  isLoading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
}

const CampaignLoadingContext = createContext<CampaignLoadingContextType | undefined>(undefined);

export function CampaignLoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);

  const startLoading = useCallback(() => {
    setIsLoading(true);
  }, []);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
  }, []);

  return (
    <CampaignLoadingContext.Provider value={{ isLoading, startLoading, stopLoading }}>
      {children}
    </CampaignLoadingContext.Provider>
  );
}

export function useCampaignLoading() {
  const context = useContext(CampaignLoadingContext);
  if (context === undefined) {
    throw new Error('useCampaignLoading must be used within a CampaignLoadingProvider');
  }
  return context;
}
