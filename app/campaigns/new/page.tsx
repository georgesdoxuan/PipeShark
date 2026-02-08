'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import CampaignForm from '@/components/CampaignForm';
import type { CampaignFormState } from '@/components/CampaignForm';

const DRAFT_STORAGE_KEY = 'pipeshark_campaign_draft';

export default function NewCampaignPage() {
  const router = useRouter();
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [initialFormState, setInitialFormState] = useState<Partial<CampaignFormState> | undefined>(undefined);

  useEffect(() => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem(DRAFT_STORAGE_KEY) : null;
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<CampaignFormState>;
        if (parsed && typeof parsed === 'object') {
          setInitialFormState(parsed);
        }
      }
    } catch {
      // Ignore invalid JSON
    }
  }, []);

  const handleSaveDraft = (state: CampaignFormState) => {
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore quota exceeded etc.
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleCampaignCreated = (id: string) => {
    setCampaignId(id);
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // Ignore
    }
    // Redirect to campaign page after a short delay
    setTimeout(() => {
      router.push(`/campaigns/${id}`);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black relative">
      <div>
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-display font-bold text-zinc-900 dark:text-white mb-2">
              New Campaign
            </h1>
            <p className="text-zinc-600 dark:text-neutral-400">
              Set up and launch your next prospecting campaign
            </p>
          </div>

          <CampaignForm
            onSuccess={handleCampaignCreated}
            initialFormState={initialFormState}
            showBackAndSave
            onBack={handleBack}
            onSaveDraft={handleSaveDraft}
          />
        </div>
      </div>
    </div>
  );
}
