'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import Link from 'next/link';
import { Check, Loader2, ArrowRight } from 'lucide-react';

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleCheckout(planId: string) {
    setLoading(planId);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, mode: 'payment' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout failed');
      if (data.url) window.location.href = data.url;
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-100/60 dark:bg-black/70">
      <Header />
      <main className="w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-display font-bold text-zinc-900 dark:text-white mb-2">
            Pricing
          </h1>
          <p className="text-zinc-600 dark:text-sky-200/90 mb-10">
            Choose the plan that fits your prospecting needs.
          </p>

          <div className="grid sm:grid-cols-2 gap-6">
            {/* Pro plan */}
            <div className="rounded-2xl border border-zinc-200 dark:border-sky-800/50 bg-white dark:bg-neutral-900 shadow-lg overflow-hidden">
              <div className="p-6 border-b border-zinc-200 dark:border-sky-800/50">
                <h2 className="text-xl font-display font-bold text-zinc-900 dark:text-white">
                  Pro
                </h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-sky-400/90">
                  One-time purchase
                </p>
                <p className="mt-4">
                  <span className="text-3xl font-bold text-zinc-900 dark:text-white">29€</span>
                </p>
                <ul className="mt-6 space-y-3">
                  {['Daily credits for campaigns', 'Full access to all features', 'Email drafts & templates', 'Priority support'].map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-zinc-600 dark:text-sky-200">
                      <Check className="w-4 h-4 text-sky-500 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-6">
                <button
                  type="button"
                  onClick={() => handleCheckout('pro')}
                  disabled={!!loading}
                  className="w-full flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-400 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
                >
                  {loading === 'pro' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Get started
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Placeholder for a second plan later */}
            <div className="rounded-2xl border border-zinc-200 dark:border-sky-800/50 bg-white dark:bg-neutral-900 shadow-lg overflow-hidden opacity-90">
              <div className="p-6 border-b border-zinc-200 dark:border-sky-800/50">
                <h2 className="text-xl font-display font-bold text-zinc-900 dark:text-white">
                  Enterprise
                </h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-sky-400/90">
                  Coming soon
                </p>
                <p className="mt-4 text-zinc-500 dark:text-sky-400/80">Custom volume & SLA</p>
                <ul className="mt-6 space-y-3">
                  {['Custom credits', 'Dedicated support', 'API access'].map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-zinc-400 dark:text-sky-500/80">
                      <Check className="w-4 h-4 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-6">
                <button
                  type="button"
                  disabled
                  className="w-full flex items-center justify-center gap-2 bg-zinc-200 dark:bg-neutral-700 text-zinc-500 dark:text-neutral-400 font-semibold py-3 px-4 rounded-xl cursor-not-allowed"
                >
                  Contact us
                </button>
              </div>
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-zinc-500 dark:text-sky-400/80">
            Secure payment powered by Stripe. You can update or cancel anytime.
          </p>
          <p className="mt-2 text-center">
            <Link href="/dashboard" className="text-sky-500 hover:text-sky-400 text-sm font-medium">
              ← Back to dashboard
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
