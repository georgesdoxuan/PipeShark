'use client';

import { useEffect } from 'react';
import { Target, Zap, Mail, BarChart3, Shield, ArrowRight, LayoutDashboard, CreditCard, Check, Clock, FileText, Sparkles, Inbox, Send } from 'lucide-react';
import Link from 'next/link';
import ViperLogo from '@/components/ViperLogo';

const ANCHORS = ['features', 'faq', 'pricing'] as const;

export default function LandingPage() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash.slice(1);
    if (ANCHORS.includes(hash as any)) {
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handleAnchorClick = (anchor: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (window.location.pathname === '/landing') {
      e.preventDefault();
      document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-sky-950 to-black">
      {/* Header */}
      <header className="bg-black/90 backdrop-blur-sm border-b border-sky-900 sticky top-0 z-50">
        <div className="grid grid-cols-3 items-center w-full px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-2 flex-shrink-0">
            <ViperLogo className="h-12 w-auto flex-shrink-0 min-w-12" />
            <h1 className="text-xl font-brand font-bold tracking-wide text-white">PipeShark</h1>
          </div>
          <nav className="hidden sm:flex items-center justify-center gap-1 sm:gap-3">
            <Link
              href="/landing#features"
              onClick={handleAnchorClick('features')}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sky-200 hover:text-white font-medium text-sm transition-colors"
            >
              Features
            </Link>
            <Link
              href="/landing#faq"
              onClick={handleAnchorClick('faq')}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sky-200 hover:text-white font-medium text-sm transition-colors"
            >
              FAQ
            </Link>
            <Link
              href="/landing#pricing"
              onClick={handleAnchorClick('pricing')}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sky-200 hover:text-white font-medium text-sm transition-colors"
            >
              Pricing
            </Link>
          </nav>
          <div className="flex items-center justify-end gap-1 sm:gap-3">
            <Link
              href="/dashboard"
              className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 text-sky-200 hover:text-white font-medium text-sm transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-4 py-2 bg-sky-700 hover:bg-sky-600 text-white rounded-lg font-semibold text-sm transition-colors"
            >
              Try for free
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section - proportions type Lumpos: hauteur généreuse, titre large, sous-texte plus étroit */}
      <section className="relative overflow-hidden min-h-[65vh] flex flex-col justify-center pt-20 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto w-full text-center">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-display font-bold text-white mb-8 max-w-3xl mx-auto leading-tight">
            Automate your prospecting
            <br />
            <span className="text-sky-500">effortlessly</span>
          </h2>
          <p className="text-lg sm:text-xl text-sky-200/90 mb-4 max-w-xl mx-auto">
            PipeShark prospects <strong className="text-white">blue collar</strong> and <strong className="text-white">grey collar</strong> for you, generates qualified leads and personalizes your emails to turn prospects into customers.
          </p>
          <p className="text-base sm:text-lg text-sky-300/80 mb-10">
            Up to <strong className="text-sky-400">1000 emails</strong> per month.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-4 bg-sky-700 hover:bg-sky-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            Try for free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-3xl font-display font-bold text-white text-center mb-4">
            All the features you need
          </h3>
          <p className="text-sky-200/90 text-center mb-12 max-w-xl mx-auto">
            From lead generation to Gmail drafts — everything in one place, without the spam risk.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-black/50 rounded-xl p-5 border border-sky-900">
              <div className="w-10 h-10 bg-sky-800 rounded-lg flex items-center justify-center mb-3">
                <Mail className="w-5 h-5 text-sky-300" />
              </div>
              <h4 className="text-lg font-display font-bold text-white mb-1">Up to 3,000 AI-personalized emails per month</h4>
              <p className="text-sky-200/90 text-sm">90 emails per day. Each message is tailored to the prospect and your business.</p>
            </div>

            <div className="bg-black/50 rounded-xl p-5 border border-sky-900">
              <div className="w-10 h-10 bg-sky-800 rounded-lg flex items-center justify-center mb-3">
                <Clock className="w-5 h-5 text-sky-300" />
              </div>
              <h4 className="text-lg font-display font-bold text-white mb-1">Daily Launch</h4>
              <p className="text-sky-200/90 text-sm">Set your time once. PipeShark sends your daily batch automatically — no need to open the app.</p>
            </div>

            <div className="bg-black/50 rounded-xl p-5 border border-sky-900">
              <div className="w-10 h-10 bg-sky-800 rounded-lg flex items-center justify-center mb-3">
                <FileText className="w-5 h-5 text-sky-300" />
              </div>
              <h4 className="text-lg font-display font-bold text-white mb-1">Business description</h4>
              <p className="text-sky-200/90 text-sm">Describe your company once. The AI uses it to personalize every email and stay on-brand.</p>
            </div>

            <div className="bg-black/50 rounded-xl p-5 border border-sky-900">
              <div className="w-10 h-10 bg-sky-800 rounded-lg flex items-center justify-center mb-3">
                <Inbox className="w-5 h-5 text-sky-300" />
              </div>
              <h4 className="text-lg font-display font-bold text-white mb-1">Example email</h4>
              <p className="text-sky-200/90 text-sm">Feed an example of your writing. The AI matches your tone and style for a consistent voice.</p>
            </div>

            <div className="bg-black/50 rounded-xl p-5 border border-sky-900">
              <div className="w-10 h-10 bg-sky-800 rounded-lg flex items-center justify-center mb-3">
                <Sparkles className="w-5 h-5 text-sky-300" />
              </div>
              <h4 className="text-lg font-display font-bold text-white mb-1">Ultra human AI writing</h4>
              <p className="text-sky-200/90 text-sm">Natural, non-robotic copy. Reads like you wrote it — not like a template.</p>
            </div>

            <div className="bg-black/50 rounded-xl p-5 border border-sky-900">
              <div className="w-10 h-10 bg-sky-800 rounded-lg flex items-center justify-center mb-3">
                <Zap className="w-5 h-5 text-sky-300" />
              </div>
              <h4 className="text-lg font-display font-bold text-white mb-1">Gmail connection</h4>
              <p className="text-sky-200/90 text-sm">One-click connect. PipeShark works with your existing Gmail account — no new inbox.</p>
            </div>

            <div className="bg-black/50 rounded-xl p-5 border border-sky-900 lg:col-span-2">
              <div className="w-10 h-10 bg-sky-800 rounded-lg flex items-center justify-center mb-3">
                <Send className="w-5 h-5 text-sky-300" />
              </div>
              <h4 className="text-lg font-display font-bold text-white mb-1">Drafts directly in Gmail</h4>
              <p className="text-sky-200/90 text-sm">All drafts land in your Gmail draft folder, ready to review and send when you want. You stay in control.</p>
            </div>

            <div className="bg-sky-900/30 rounded-xl p-5 border border-sky-700/50">
              <div className="w-10 h-10 bg-sky-800 rounded-lg flex items-center justify-center mb-3">
                <Shield className="w-5 h-5 text-sky-300" />
              </div>
              <h4 className="text-lg font-display font-bold text-white mb-1">Drafts, not auto-send</h4>
              <p className="text-sky-200/90 text-sm">We create drafts instead of sending automatically to protect you from spam regulations. You decide when each email goes out.</p>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-sky-200/80">
            <span className="flex items-center gap-2"><Target className="w-4 h-4 text-sky-400" /> Automatic lead generation</span>
            <span className="flex items-center gap-2"><BarChart3 className="w-4 h-4 text-sky-400" /> Real-time tracking</span>
            <span className="flex items-center gap-2"><LayoutDashboard className="w-4 h-4 text-sky-400" /> Intuitive dashboard</span>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-black/40">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-3xl font-display font-bold text-white text-center mb-12">
            How it works
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-sky-800 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-white">
                1
              </div>
              <h4 className="text-xl font-display font-bold text-white mb-2">
                Create your campaign
              </h4>
              <p className="text-sky-200/90">
                Define your business sector, company description, and targeting criteria.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-sky-800 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-white">
                2
              </div>
              <h4 className="text-xl font-display font-bold text-white mb-2">
                PipeShark finds your leads
              </h4>
              <p className="text-sky-200/90">
                Our system automatically searches for qualified prospects matching your criteria.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-sky-800 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-white">
                3
              </div>
              <h4 className="text-xl font-display font-bold text-white mb-2">
                Personalized emails
              </h4>
              <p className="text-sky-200/90">
                Emails are automatically generated and personalized for each prospect.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-3xl font-display font-bold text-white text-center mb-4">
            Simple pricing
          </h3>
          <p className="text-sky-200/90 text-center mb-12 max-w-xl mx-auto">
            Choose the plan that fits your volume. Every email is unique and personalized for each prospect, with natural, human-sounding copy. All plans include lead generation and Daily Launch automation.
          </p>
          <div className="grid md:grid-cols-4 gap-6">
            {/* Free */}
            <div className="rounded-2xl border border-sky-800/60 bg-black/50 p-6 flex flex-col min-w-0">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-5 h-5 text-sky-400 shrink-0" />
                <h4 className="text-lg font-display font-bold text-white">Free</h4>
              </div>
              <p className="text-sky-300/90 text-sm mb-5">
                Full Standard features for <strong className="text-white">7 days</strong>. No card required.
              </p>
              <ul className="space-y-3 text-sm text-sky-200/90 mb-6 flex-1">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <span>Same features as Standard</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <span>7-day access only</span>
                </li>
              </ul>
              <Link
                href="/dashboard"
                className="block w-full text-center px-4 py-3 rounded-xl border border-sky-600 text-sky-300 hover:bg-sky-900/40 font-medium text-sm transition-colors mt-auto"
              >
                Start free trial
              </Link>
            </div>

            {/* Standard */}
            <div className="rounded-2xl border border-sky-800/60 bg-black/50 p-6 flex flex-col min-w-0">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-5 h-5 text-sky-400 shrink-0" />
                <h4 className="text-lg font-display font-bold text-white">Standard</h4>
              </div>
              <p className="text-2xl font-bold text-white mb-5">
                $24<span className="text-sm font-normal text-sky-300">/month</span>
              </p>
              <ul className="space-y-3 text-sm text-sky-200/90 mb-6 flex-1">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <span><strong className="text-white">1,000</strong> AI emails/month (30/day)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <span>Unique, human-sounding email per prospect</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <span>Email, phone, URL per lead</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <span><strong className="text-white">Daily Launch</strong> — automatic every day</span>
                </li>
              </ul>
              <Link
                href="/pricing"
                className="block w-full text-center px-4 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm transition-colors mt-auto"
              >
                Get Standard
              </Link>
            </div>

            {/* Pro */}
            <div className="rounded-2xl border-2 border-sky-500 bg-sky-950/40 p-6 flex flex-col relative min-w-0">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-sky-600 text-white text-xs font-semibold rounded-full">
                Most popular
              </span>
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-5 h-5 text-sky-400 shrink-0" />
                <h4 className="text-lg font-display font-bold text-white">Pro</h4>
              </div>
              <p className="text-2xl font-bold text-white mb-5">
                $59<span className="text-sm font-normal text-sky-300">/month</span>
              </p>
              <ul className="space-y-3 text-sm text-sky-200/90 mb-6 flex-1">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <span><strong className="text-white">3,000</strong> AI emails/month (90/day)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <span>Unique, human-sounding email per prospect</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <span>Same as Standard + Daily Launch</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <span>For teams or heavy users</span>
                </li>
              </ul>
              <Link
                href="/pricing"
                className="block w-full text-center px-4 py-3 rounded-xl bg-sky-700 hover:bg-sky-600 text-white font-semibold text-sm transition-colors mt-auto"
              >
                Get Pro
              </Link>
            </div>

            {/* Business */}
            <div className="rounded-2xl border border-sky-800/60 bg-black/50 p-6 flex flex-col min-w-0">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-5 h-5 text-sky-400 shrink-0" />
                <h4 className="text-lg font-display font-bold text-white">Business</h4>
              </div>
              <p className="text-sky-300/90 text-sm mb-5">
                Custom volume, dedicated support. Tell us your needs.
              </p>
              <ul className="space-y-3 text-sm text-sky-200/90 mb-6 flex-1">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <span>Custom email volume</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <span>All Pro + priority support</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <span>Agencies & large teams</span>
                </li>
              </ul>
              <Link
                href="mailto:hello@pipeshark.com?subject=Business plan"
                className="block w-full text-center px-4 py-3 rounded-xl border border-sky-600 text-sky-300 hover:bg-sky-900/40 font-medium text-sm transition-colors mt-auto"
              >
                Contact us
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8 bg-black/40">
        <div className="max-w-3xl mx-auto">
          <h3 className="text-3xl font-display font-bold text-white text-center mb-10">
            Frequently asked questions
          </h3>
          <dl className="space-y-6">
            <div className="rounded-xl border border-sky-800/60 bg-black/50 p-5">
              <dt className="text-lg font-semibold text-white mb-2">What is PipeShark?</dt>
              <dd className="text-sky-200/90 text-sm">
                PipeShark is an automated prospecting tool for local and trade businesses (plumbers, electricians, HVAC, etc.). It finds qualified leads based on your sector and location, generates AI-personalized email drafts for each prospect, and drops them directly into your Gmail drafts so you can review and send when you want. You stay in control while saving hours of research and writing.
              </dd>
            </div>
            <div className="rounded-xl border border-sky-800/60 bg-black/50 p-5">
              <dt className="text-lg font-semibold text-white mb-2">Why drafts instead of sending emails automatically?</dt>
              <dd className="text-sky-200/90 text-sm">
                We create drafts in your Gmail instead of sending automatically to protect you from spam regulations and sender reputation issues. You review each message, tweak it if needed, and hit send yourself. That way you stay compliant and keep a human in the loop while still benefiting from automation.
              </dd>
            </div>
            <div className="rounded-xl border border-sky-800/60 bg-black/50 p-5">
              <dt className="text-lg font-semibold text-white mb-2">What is Daily Launch?</dt>
              <dd className="text-sky-200/90 text-sm">
                Daily Launch lets you set a time (e.g. 9:00) once. Every day at that time, PipeShark automatically runs your selected campaigns: it finds leads, generates personalized drafts, and adds them to your Gmail draft folder. You don’t need to open PipeShark — it runs in the background so you get a fresh batch of drafts every day without lifting a finger.
              </dd>
            </div>
            <div className="rounded-xl border border-sky-800/60 bg-black/50 p-5">
              <dt className="text-lg font-semibold text-white mb-2">How does the AI personalize my emails?</dt>
              <dd className="text-sky-200/90 text-sm">
                You provide a business description (what you do, who you serve) and optionally an example email in your style. The AI uses that plus each lead’s business type and location to write unique, human-sounding emails. The tone can be professional, casual, or direct — you choose. No generic templates: each draft is tailored to the prospect and your brand.
              </dd>
            </div>
            <div className="rounded-xl border border-sky-800/60 bg-black/50 p-5">
              <dt className="text-lg font-semibold text-white mb-2">What do I get for each lead?</dt>
              <dd className="text-sky-200/90 text-sm">
                For every lead we find, you get: email address, phone number, and website URL when available. The lead is added to your campaign in PipeShark with an AI-generated email draft. You can see all leads in your dashboard, filter by reply status, and track which prospects have answered.
              </dd>
            </div>
            <div className="rounded-xl border border-sky-800/60 bg-black/50 p-5">
              <dt className="text-lg font-semibold text-white mb-2">Do I need to connect Gmail?</dt>
              <dd className="text-sky-200/90 text-sm">
                Yes. PipeShark works with your existing Gmail account. You connect it once; we then create drafts in your Gmail draft folder and can detect when a prospect replies so we can mark them as “Replied” in your dashboard. Your emails stay in your inbox — no separate tool to check.
              </dd>
            </div>
            <div className="rounded-xl border border-sky-800/60 bg-black/50 p-5">
              <dt className="text-lg font-semibold text-white mb-2">What are credits and how do they work?</dt>
              <dd className="text-sky-200/90 text-sm">
                One credit = one lead (and one AI-generated draft). Your plan has a monthly limit (e.g. 1,000 or 3,000) and a daily cap so you don’t burn through everything at once. Credits reset every day; you choose how many leads per campaign and when Daily Launch runs. The dashboard shows how many you’ve used today and how many remain.
              </dd>
            </div>
            <div className="rounded-xl border border-sky-800/60 bg-black/50 p-5">
              <dt className="text-lg font-semibold text-white mb-2">Who is PipeShark for?</dt>
              <dd className="text-sky-200/90 text-sm">
                PipeShark is built for local service and trade businesses (plumbers, electricians, HVAC, contractors, etc.) that want to prospect consistently without spending hours on research and cold emails. If you target businesses by sector and location and want personalized outreach at scale, PipeShark fits. It’s especially useful if you already use Gmail and prefer to send from your own account.
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-4xl font-display font-bold text-white mb-6">
            Ready to transform your prospecting?
          </h3>
          <p className="text-xl text-sky-200/90 mb-8">
            Join PipeShark and automate your lead generation today.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-4 bg-sky-700 hover:bg-sky-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            Get started now
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Article previews – click to read full article */}
      <section id="article" className="py-16 px-4 sm:px-6 lg:px-8 border-t border-sky-900/50">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-sky-400 text-sm font-medium mb-8">Read our article</p>
          <div className="max-w-xl mx-auto">
            <Link
              href="/article"
              className="block group rounded-2xl overflow-hidden border border-sky-800/50 bg-black/40 hover:bg-sky-900/30 transition-all duration-300 hover:border-sky-600/50 hover:shadow-xl hover:shadow-sky-900/20"
            >
              <div className="aspect-video bg-zinc-800 overflow-hidden relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={process.env.NEXT_PUBLIC_ARTICLE_PREVIEW_IMAGE_URL || '/shutterstock_146630252-scaled-1.jpg'}
                  alt="AI Automation in Blue-Collar Trades"
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                  width={640}
                  height={360}
                  loading="eager"
                  decoding="async"
                />
              </div>
              <div className="p-5">
                <h2 className="text-lg md:text-xl font-display font-bold text-white group-hover:text-sky-200 transition-colors">
                  AI Automation in Blue-Collar Trades: Hype or Essential Next Step?
                </h2>
                <p className="mt-2 text-sky-300/90 text-sm">
                  How AI is reshaping the skilled trades – and why it matters for PipeShark.
                </p>
                <span className="inline-flex items-center gap-2 mt-3 text-sky-400 group-hover:text-sky-300 text-sm font-medium">
                  Read full article
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black border-t border-sky-900 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <ViperLogo className="h-16 w-auto flex-shrink-0 min-w-16" />
            <h4 className="text-xl font-brand font-bold tracking-wide text-white">PipeShark</h4>
          </div>
          <p className="text-sky-500 text-sm">
            Automated prospecting tool
          </p>
        </div>
      </footer>
    </div>
  );
}
