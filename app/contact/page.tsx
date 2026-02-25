'use client';

import Link from 'next/link';
import Header from '@/components/Header';
import { Mail, ArrowLeft } from 'lucide-react';

const CONTACT_EMAIL = 'hello@pipeshark.io';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-neutral-950">
      <Header />
      <main className="mx-auto max-w-xl px-4 py-12">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <div className="rounded-2xl border border-zinc-200 dark:border-sky-800/50 bg-white dark:bg-neutral-900 p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-500/20 flex items-center justify-center">
              <Mail className="w-6 h-6 text-sky-600 dark:text-sky-400" />
            </div>
            <h1 className="text-2xl font-display font-bold text-zinc-900 dark:text-white">
              Contact
            </h1>
          </div>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">
            Questions, support or feedback? Reach us at:
          </p>
          <p className="text-lg font-semibold text-sky-600 dark:text-sky-400 mb-6">
            {CONTACT_EMAIL}
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-medium transition-colors"
          >
            <Mail className="w-4 h-4" />
            Send an email
          </a>
        </div>
      </main>
    </div>
  );
}
