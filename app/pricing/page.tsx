'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import { Check, Loader2, Zap, Users } from 'lucide-react';

// Remplace ces valeurs par tes vrais Price IDs Stripe (mode subscription)
// Ex: 'price_1Abc123...'
const STRIPE_PRICE_SOLO = process.env.NEXT_PUBLIC_STRIPE_PRICE_SOLO ?? '';
const STRIPE_PRICE_TEAM = process.env.NEXT_PUBLIC_STRIPE_PRICE_TEAM ?? '';

const PLANS = [
  {
    id: 'solo',
    priceId: STRIPE_PRICE_SOLO,
    name: 'Solo',
    price: '19',
    period: '/month',
    description: '1 connected mailbox',
    icon: Zap,
    iconColor: 'bg-sky-500',
    highlight: false,
    features: [
      '1 connected mailbox (Gmail)',
      'Up to 1,000 emails / month',
      '30 leads per day',
      'AI-generated personalised emails',
      'Gmail drafts & scheduled sending',
      'Call Center & lead tracking',
      'Dashboard & analytics',
    ],
  },
  {
    id: 'team',
    priceId: STRIPE_PRICE_TEAM,
    name: 'Team',
    price: '15',
    period: '/mailbox/month',
    description: 'From 5 mailboxes — billed per seat',
    icon: Users,
    iconColor: 'bg-violet-600',
    highlight: true,
    features: [
      'Everything in Solo',
      'Minimum 5 mailboxes',
      '15 € per mailbox per month',
      '1,000 emails per mailbox / month',
      '30 leads per day per mailbox',
      'Centralised dashboard',
      'Priority support',
    ],
  },
];

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleCheckout(plan: typeof PLANS[0]) {
    if (!plan.priceId) {
      alert('Stripe price ID not configured for this plan. Add NEXT_PUBLIC_STRIPE_PRICE_' + plan.id.toUpperCase() + ' to your environment variables.');
      return;
    }
    setLoading(plan.id);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: plan.priceId, mode: 'subscription' }),
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
    <>
      <Header />
      <main className="px-4 sm:px-6 lg:px-8 py-12 max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Simple, transparent pricing</h1>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">No hidden fees. Cancel anytime.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border bg-white dark:bg-neutral-900 shadow-lg overflow-hidden flex flex-col ${
                  plan.highlight
                    ? 'border-violet-400 dark:border-violet-600 ring-2 ring-violet-400/30 dark:ring-violet-600/30'
                    : 'border-zinc-200 dark:border-neutral-800'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute top-4 right-4 bg-violet-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                    Best value
                  </div>
                )}

                <div className="p-6 border-b border-zinc-100 dark:border-neutral-800">
                  <div className={`w-10 h-10 rounded-xl ${plan.iconColor} flex items-center justify-center mb-4`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{plan.name}</h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{plan.description}</p>
                  <div className="mt-4 flex items-end gap-1">
                    <span className="text-4xl font-bold text-zinc-900 dark:text-white">{plan.price}€</span>
                    <span className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">{plan.period}</span>
                  </div>
                </div>

                <div className="p-6 flex-1">
                  <ul className="space-y-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-zinc-600 dark:text-zinc-300">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="px-6 pb-6">
                  <button
                    type="button"
                    onClick={() => handleCheckout(plan)}
                    disabled={!!loading}
                    className={`w-full flex items-center justify-center gap-2 font-semibold py-3 px-4 rounded-xl transition-colors disabled:opacity-60 ${
                      plan.highlight
                        ? 'bg-violet-600 hover:bg-violet-700 text-white'
                        : 'bg-sky-500 hover:bg-sky-600 text-white'
                    }`}
                  >
                    {loading === plan.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Get started
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-sm text-zinc-400 dark:text-zinc-500">
          Secure payment via Stripe · Subscription · Cancel anytime
        </p>
      </main>
    </>
  );
}
