'use client';

import Header from '@/components/Header';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function GDPRCompliancePage() {
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
          GDPR compliance notice
        </h1>
        <p className="text-sm text-zinc-500 dark:text-neutral-500 mb-8">
          EU General Data Protection Regulation (Regulation (EU) 2016/679)
        </p>

        <div className="prose prose-zinc dark:prose-invert prose-sm max-w-none space-y-6 text-zinc-600 dark:text-neutral-400">
          <section>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">Our commitment</h2>
            <p>
              We process personal data in accordance with the EU General Data Protection Regulation (GDPR). This
              notice summarises your rights and how we meet our obligations when we act as a data controller.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">Your rights</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-zinc-800 dark:text-neutral-300">Access:</strong> You can request a copy of the personal data we hold about you.</li>
              <li><strong className="text-zinc-800 dark:text-neutral-300">Rectification:</strong> You can ask us to correct inaccurate or incomplete data.</li>
              <li><strong className="text-zinc-800 dark:text-neutral-300">Erasure:</strong> You can ask us to delete your data in certain circumstances (&quot;right to be forgotten&quot;).</li>
              <li><strong className="text-zinc-800 dark:text-neutral-300">Restriction:</strong> You can ask us to limit how we process your data in certain cases.</li>
              <li><strong className="text-zinc-800 dark:text-neutral-300">Portability:</strong> You can request your data in a structured, machine-readable format.</li>
              <li><strong className="text-zinc-800 dark:text-neutral-300">Objection:</strong> You can object to processing based on legitimate interests or for direct marketing.</li>
              <li><strong className="text-zinc-800 dark:text-neutral-300">Withdraw consent:</strong> Where we rely on consent, you may withdraw it at any time.</li>
              <li><strong className="text-zinc-800 dark:text-neutral-300">Complaint:</strong> You have the right to lodge a complaint with a supervisory authority in your country.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">How to exercise your rights</h2>
            <p>
              To exercise any of these rights, contact us using the email or address provided in the Privacy Policy
              or in your account settings. We will respond within the timeframes required by the GDPR (generally
              one month). We may need to verify your identity before processing your request.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">Data security</h2>
            <p>
              We implement appropriate technical and organisational measures to protect your data. Your data is
              encrypted in transit and stored in secure, access-controlled environments. We do not sell your
              personal data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">Contact</h2>
            <p>
              For any request or question regarding GDPR or your personal data, please contact us at the address
              or email provided in the Privacy Policy.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
