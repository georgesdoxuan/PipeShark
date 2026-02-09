'use client';

import Header from '@/components/Header';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black relative">
      <Header />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/preferences"
          className="inline-flex items-center gap-2 text-zinc-500 dark:text-neutral-400 hover:text-zinc-900 dark:hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Preferences
        </Link>
        <h1 className="text-2xl font-display font-bold text-zinc-900 dark:text-white mb-6">
          Privacy Policy
        </h1>
        <p className="text-sm text-zinc-500 dark:text-neutral-500 mb-8">
          Last updated: February 2026
        </p>

        <div className="prose prose-zinc dark:prose-invert prose-sm max-w-none space-y-6 text-zinc-600 dark:text-neutral-400">
          <section>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">1. Who we are</h2>
            <p>
              PipeShark (&quot;we&quot;, &quot;our&quot;) operates the PipeShark prospecting and campaign service.
              We are the data controller for the personal data we collect through the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">2. Data we collect</h2>
            <p>
              We collect: (a) account data (email, name, password hash); (b) Gmail connection data (OAuth tokens,
              email address) when you connect Gmail; (c) campaign and lead data you create (business type, cities,
              company description, leads and drafts); (d) usage data (logs, timestamps) necessary to operate the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">3. How we use your data</h2>
            <p>
              We use your data to provide, maintain, and improve the Service; to send you email drafts via Gmail when
              you request them; to enforce our Terms and comply with the law. We do not sell your personal data to
              third parties.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">4. Legal basis (GDPR)</h2>
            <p>
              We process your data on the basis of: (a) performance of our contract with you; (b) your consent (e.g.
              Gmail connection); (c) our legitimate interests (security, analytics, improvement); (d) legal obligation.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">5. Data retention</h2>
            <p>
              We retain your account and campaign data for as long as your account is active. After account closure,
              we may retain certain data for a limited period for legal or operational reasons, then delete or
              anonymise it.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">6. Security and encryption</h2>
            <p>
              We use industry-standard measures to protect your data. Data in transit is encrypted (HTTPS/TLS). Data
              at rest is stored in secure, access-controlled environments. Your data is encrypted and secure.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">7. Your rights</h2>
            <p>
              You have the right to access, rectify, erase, restrict processing, and port your data, and to object or
              withdraw consent where applicable. You may also lodge a complaint with a supervisory authority. See our
              GDPR compliance notice for more detail.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">8. Third parties</h2>
            <p>
              We use Supabase (hosting and database), Vercel (hosting), and Google (Gmail OAuth and API). Their
              processing is governed by their privacy policies. We may use other sub-processors; we will inform you
              of significant changes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">9. Contact</h2>
            <p>
              For privacy requests or questions, contact us at the email or address indicated in your account or
              on our website.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
