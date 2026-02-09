'use client';

import { useEffect, useState } from 'react';

const DEFAULT_DAILY_LIMIT = 300;

interface CreditsGaugeProps {
  campaignId?: string;
  leadsWithEmail?: number;
  compact?: boolean;
}

export default function CreditsGauge({ campaignId, leadsWithEmail, compact = false }: CreditsGaugeProps) {
  const [count, setCount] = useState(0);
  const [remaining, setRemaining] = useState(DEFAULT_DAILY_LIMIT);
  const [limit, setLimit] = useState(DEFAULT_DAILY_LIMIT);
  const [timeUntilReset, setTimeUntilReset] = useState(0);

  const fetchQuota = async () => {
    try {
      const res = await fetch('/api/campaigns/count-today');
      if (res.ok) {
        const data = await res.json();
        setCount(data.count);
        setRemaining(data.remaining);
        if (typeof data.limit === 'number') setLimit(data.limit);
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchQuota();
    const interval = setInterval(fetchQuota, 20000); // Update every 20 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      setTimeUntilReset(tomorrow.getTime() - now.getTime());
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Daily Credits = sum of number_credits_used for campaigns created today (global, not per-campaign)
  const currentCredits = count;
  const dailyLimit = limit;
  const percentage = dailyLimit > 0 ? (currentCredits / dailyLimit) * 100 : 0;

  const formatTime = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-zinc-200 dark:bg-neutral-800 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sky-600 to-sky-500 transition-all duration-300"
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-700 dark:text-sky-200 font-medium">Daily Credits</span>
        <span className="text-sm text-sky-600 dark:text-sky-300 font-semibold">
          {currentCredits}/{dailyLimit} used
        </span>
      </div>
      <div className="bg-zinc-200 dark:bg-neutral-800 rounded-full h-3 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            percentage >= 100
              ? 'bg-gradient-to-r from-rose-500 to-rose-400'
              : percentage >= 80
              ? 'bg-gradient-to-r from-amber-500 to-amber-400'
              : 'bg-gradient-to-r from-sky-600 to-sky-500'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-neutral-400">
        <span>Remaining: {remaining}</span>
        <span>Resets in: {formatTime(timeUntilReset)}</span>
      </div>
    </div>
  );
}
