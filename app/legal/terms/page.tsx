'use client';

import Header from '@/components/Header';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-white/60 dark:bg-black/70 relative">
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
          Terms of Service
        </h1>
        <p className="text-sm text-zinc-500 dark:text-neutral-500 mb-8">
          Last updated: February 2026
        </p>

        <div className="prose prose-zinc dark:prose-invert prose-sm max-w-none space-y-6 text-zinc-600 dark:text-neutral-400">
          <section>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">1. Acceptance of terms</h2>
            <p>
              By accessing or using PipeShark (&quot;the Service&quot;), you agree to be bound by these Terms of Service.
              If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">2. Description of service</h2>
            <p>
              PipeShark is a prospecting and campaign management tool that helps you generate leads and email drafts.
              The Service may use third-party integrations (e.g. Gmail, n8n) subject to their respective terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">3. Account and use</h2>
            <p>
              You must provide accurate information and keep your account secure. You are responsible for all activity
              under your account. You must use the Service in compliance with applicable laws and not for spam, fraud,
              or abuse.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">4. Acceptable use</h2>
            <p>
              You may not use the Service to send unsolicited bulk emails in violation of anti-spam laws (e.g. CAN-SPAM, GDPR).
              You must respect daily limits and usage rules. We may suspend or terminate access for misuse.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">5. Intellectual property</h2>
            <p>
              The Service and its content (excluding your data) are owned by us or our licensors. You retain ownership
              of your data. We do not claim rights over the content you create or the leads you collect.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">6. Limitation of liability</h2>
            <p>
              The Service is provided &quot;as is&quot;. To the maximum extent permitted by law, we exclude liability for
              indirect, incidental, or consequential damages. Our total liability is limited to the amount you paid
              for the Service in the twelve months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">7. Changes and termination</h2>
            <p>
              We may update these Terms from time to time; continued use constitutes acceptance. We may modify or
              discontinue the Service with reasonable notice. You may close your account at any time.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">8. Contact</h2>
            <p>
              For questions about these Terms, contact us at the address or email provided in the Privacy Policy or
              in your account settings.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
