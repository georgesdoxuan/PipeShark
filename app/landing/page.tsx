'use client';

import { useEffect, useState, useMemo } from 'react';
import { Target, BarChart3, Shield, ArrowRight, LayoutDashboard, CreditCard, Check, Inbox, Ticket } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import ViperLogo from '@/components/ViperLogo';

const ANCHORS = ['features', 'faq', 'pricing'] as const;

// Fish component with different shapes (floating background)
function SwimmingFish({ delay, duration, top, size, direction, shapeIndex }: { delay: number; duration: number; top: string; size: string; direction: 'left' | 'right'; shapeIndex: number }) {
  const fishShapes = [
    <svg key="1" width={size} height={size} viewBox="0 0 100 60" className={direction === 'right' ? '' : 'scale-x-[-1]'}>
      <ellipse cx="50" cy="30" rx="40" ry="25" fill="#0c4a6e" opacity="0.75" />
      <polygon points="28,30 -8,0 -8,60" fill="#0c4a6e" opacity="0.75" />
      <circle cx="65" cy="25" r="3" fill="#0369a1" opacity="0.85" />
    </svg>,
    <svg key="2" width={size} height={size} viewBox="0 0 100 60" className={direction === 'right' ? '' : 'scale-x-[-1]'}>
      <ellipse cx="50" cy="30" rx="35" ry="20" fill="#0c4a6e" opacity="0.7" />
      <polygon points="30,30 -6,2 -6,58" fill="#0c4a6e" opacity="0.7" />
      <ellipse cx="60" cy="28" rx="8" ry="6" fill="#0369a1" opacity="0.8" />
      <circle cx="70" cy="22" r="2" fill="#0ea5e9" opacity="0.9" />
    </svg>,
    <svg key="3" width={size} height={size} viewBox="0 0 100 60" className={direction === 'right' ? '' : 'scale-x-[-1]'}>
      <path d="M 20 30 Q 50 10 80 30 Q 50 50 20 30" fill="#0c4a6e" opacity="0.75" />
      <polygon points="28,30 -5,8 -5,52" fill="#0c4a6e" opacity="0.75" />
      <circle cx="70" cy="28" r="4" fill="#0369a1" opacity="0.85" />
    </svg>,
    <svg key="4" width={size} height={size} viewBox="0 0 100 60" className={direction === 'right' ? '' : 'scale-x-[-1]'}>
      <ellipse cx="45" cy="30" rx="30" ry="22" fill="#0c4a6e" opacity="0.7" />
      <polygon points="28,30 -4,4 -4,56" fill="#0c4a6e" opacity="0.7" />
      <circle cx="55" cy="25" r="3" fill="#0369a1" opacity="0.8" />
      <path d="M 65 20 Q 70 25 65 30" fill="#0ea5e9" opacity="0.75" />
    </svg>,
    <svg key="5" width={size} height={size} viewBox="0 0 100 60" className={direction === 'right' ? '' : 'scale-x-[-1]'}>
      <ellipse cx="50" cy="30" rx="42" ry="18" fill="#0c4a6e" opacity="0.65" />
      <polygon points="26,30 -10,6 -10,54" fill="#0c4a6e" opacity="0.65" />
      <circle cx="68" cy="26" r="3" fill="#0369a1" opacity="0.75" />
      <ellipse cx="75" cy="30" rx="4" ry="8" fill="#0ea5e9" opacity="0.65" />
    </svg>,
  ];
  const selectedShape = fishShapes[shapeIndex % fishShapes.length];
  return (
    <div
      className={`absolute opacity-15 ${direction === 'right' ? 'animate-swim-right' : 'animate-swim-left'}`}
      style={{
        top,
        left: direction === 'right' ? '-150px' : 'calc(100% + 150px)',
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
      }}
    >
      {selectedShape}
    </div>
  );
}

export default function LandingPage() {
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);

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

  const bubbles = useMemo(() => {
    return Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 10,
      duration: 12 + Math.random() * 8,
      size: i % 3,
    }));
  }, []);

  const fishes = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      id: i,
      delay: Math.random() * 5,
      duration: 15 + Math.random() * 20,
      top: `${10 + Math.random() * 80}%`,
      size: `${20 + Math.random() * 40}px`,
      direction: (Math.random() > 0.5 ? 'right' : 'left') as 'left' | 'right',
      shapeIndex: Math.floor(Math.random() * 5),
    }));
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-neutral-950 relative overflow-hidden">
      {/* Blue gradient from bottom – almost white / very light blue at top */}
      <div
        className="fixed inset-0 z-0 pointer-events-none bg-gradient-to-t from-sky-200/90 via-sky-50/40 to-white/95 dark:from-sky-900/60 dark:via-sky-950/30 dark:to-neutral-950"
        aria-hidden
      />
      {/* Bubbles – hidden */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden invisible">
        {bubbles.map((bubble) => (
          <div
            key={bubble.id}
            className={`bubble bubble-landing-page bubble-landing-${bubble.size}`}
            style={{
              left: `${bubble.left}%`,
              animationDelay: `${bubble.delay}s`,
              animationDuration: `${bubble.duration}s`,
            }}
          />
        ))}
      </div>
      {/* Animated fish background – hidden */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden invisible">
        {fishes.map((fish) => (
          <SwimmingFish
            key={fish.id}
            delay={fish.delay}
            duration={fish.duration}
            top={fish.top}
            size={fish.size}
            direction={fish.direction}
            shapeIndex={fish.shapeIndex}
          />
        ))}
      </div>

      <div className="relative z-10">
      {/* Header – same style as dashboard */}
      <header className="bg-transparent sticky top-0 z-50">
        <div className="grid grid-cols-3 items-center w-full px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-2 flex-shrink-0">
            <ViperLogo className="h-14 w-auto flex-shrink-0 min-w-14" />
            <h1 className="text-2xl font-brand font-bold tracking-wide text-zinc-900 dark:text-white">Pipeshark</h1>
          </div>
          <nav className="hidden sm:flex items-center justify-center gap-1 sm:gap-3">
            <Link
              href="/landing#features"
              onClick={handleAnchorClick('features')}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-zinc-600 dark:text-sky-200 hover:text-zinc-900 dark:hover:text-white font-medium text-sm transition-colors"
            >
              Features
            </Link>
            <Link
              href="/landing#faq"
              onClick={handleAnchorClick('faq')}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-zinc-600 dark:text-sky-200 hover:text-zinc-900 dark:hover:text-white font-medium text-sm transition-colors"
            >
              FAQ
            </Link>
            <Link
              href="/landing#pricing"
              onClick={handleAnchorClick('pricing')}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-zinc-600 dark:text-sky-200 hover:text-zinc-900 dark:hover:text-white font-medium text-sm transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-3 py-1.5 text-zinc-600 dark:text-sky-200 hover:text-zinc-900 dark:hover:text-white font-medium text-sm transition-colors"
            >
              Contact
            </Link>
          </nav>
          <div className="flex items-center justify-end gap-1 sm:gap-3">
            <Link
              href="/dashboard"
              className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 text-zinc-600 dark:text-sky-200 hover:text-zinc-900 dark:hover:text-white font-medium text-sm transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-500 text-white rounded-xl font-semibold text-sm transition-colors shadow-sm"
            >
              Try for free
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-[65vh] flex flex-col justify-center pt-20 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto w-full text-center">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-display font-bold text-zinc-900 dark:text-white mb-8 max-w-3xl mx-auto leading-tight">
            Prospect Local Businesses
            <br />
            <span className="text-sky-500 dark:text-sky-400">on autopilot</span>
          </h2>
          <p className="text-lg sm:text-xl text-zinc-600 dark:text-sky-200/90 mb-4 max-w-xl mx-auto">
            PipeShark finds <strong className="text-zinc-900 dark:text-white">local businesses</strong> on Google Maps and prospects them for you — generates qualified leads and personalizes your emails so you win more customers.
          </p>
          <p className="text-base sm:text-lg text-zinc-500 dark:text-sky-300/80 mb-10">
            Up to <strong className="text-sky-600 dark:text-sky-400">3,000 emails</strong> per month.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-8 py-4 bg-sky-500 hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-500 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Try for free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="https://calendly.com/hello-pipeshark/30min"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white dark:bg-neutral-800 text-zinc-900 dark:text-white border-2 border-zinc-200 dark:border-sky-600/50 hover:border-sky-500 dark:hover:border-sky-500 rounded-xl font-semibold text-lg shadow-md hover:shadow-lg transition-all duration-200"
            >
              Book a Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section – unified icon size, refined cards */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-3xl font-display font-bold text-zinc-900 dark:text-white text-center mb-4">
            All the features you need to prospect local businesses
          </h3>
          <p className="text-zinc-600 dark:text-sky-200/90 text-center mb-12 max-w-xl mx-auto">
            From lead generation to Gmail drafts — everything in one place, without the spam risk.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="group bg-white dark:bg-neutral-800/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col items-center text-center">
              <div className="h-12 flex items-center justify-center mb-4 w-full">
                <span className="flex items-center justify-center w-8 h-8" style={{ filter: 'brightness(0) saturate(100%) invert(42%) sepia(93%) saturate(935%) hue-rotate(121deg) brightness(96%) contrast(90%)' }}>
                  <Image src="/email.png" alt="" width={32} height={32} className="w-8 h-8 object-contain dark:opacity-90" />
                </span>
              </div>
              <h4 className="text-lg font-display font-bold text-zinc-900 dark:text-white mb-2 leading-snug">Up to 3,000 AI-personalized emails per month</h4>
              <p className="text-zinc-600 dark:text-sky-200/90 text-sm leading-relaxed">90 emails per day. Each message is tailored to the prospect and your business.</p>
            </div>

            <div className="group bg-white dark:bg-neutral-800/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col items-center text-center">
              <div className="h-12 flex items-center justify-center mb-4 w-full">
                <span className="flex items-center justify-center w-8 h-8" style={{ filter: 'brightness(0) saturate(100%) invert(42%) sepia(98%) saturate(1500%) hue-rotate(186deg) brightness(96%) contrast(90%)' }}>
                  <Image src="/time.png" alt="" width={32} height={32} className="w-8 h-8 object-contain dark:opacity-90" />
                </span>
              </div>
              <h4 className="text-lg font-display font-bold text-zinc-900 dark:text-white mb-2 leading-snug">Daily Launch</h4>
              <p className="text-zinc-600 dark:text-sky-200/90 text-sm leading-relaxed">Set your time once. PipeShark sends your daily batch automatically — no need to open the app.</p>
            </div>

            <div className="group bg-white dark:bg-neutral-800/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col items-center text-center">
              <div className="h-12 flex items-center justify-center mb-4 w-full">
                <span className="flex items-center justify-center w-8 h-8" style={{ filter: 'brightness(0) saturate(100%) invert(42%) sepia(98%) saturate(1500%) hue-rotate(186deg) brightness(96%) contrast(90%)' }}>
                  <Image src="/text-file.png" alt="" width={32} height={32} className="w-8 h-8 object-contain dark:opacity-90" />
                </span>
              </div>
              <h4 className="text-lg font-display font-bold text-zinc-900 dark:text-white mb-2 leading-snug">Business description</h4>
              <p className="text-zinc-600 dark:text-sky-200/90 text-sm leading-relaxed">Describe your company once. The AI uses it to personalize every email and stay on-brand.</p>
            </div>

            <div className="group bg-white dark:bg-neutral-800/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col items-center text-center">
              <div className="h-12 flex items-center justify-center mb-4 w-full">
                <Inbox className="w-8 h-8 text-sky-600 dark:text-sky-400" strokeWidth={2} />
              </div>
              <h4 className="text-lg font-display font-bold text-zinc-900 dark:text-white mb-2 leading-snug">Example email</h4>
              <p className="text-zinc-600 dark:text-sky-200/90 text-sm leading-relaxed">Feed an example of your writing. The AI matches your tone and style for a consistent voice.</p>
            </div>

            <div className="group bg-white dark:bg-neutral-800/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col items-center text-center">
              <div className="h-12 flex items-center justify-center mb-4 w-full">
                <span className="flex items-center justify-center w-8 h-8" style={{ filter: 'brightness(0) saturate(100%) invert(65%) sepia(98%) saturate(500%) hue-rotate(5deg) brightness(95%) contrast(90%)' }}>
                  <Image src="/pen.png" alt="" width={32} height={32} className="w-8 h-8 object-contain dark:opacity-90" />
                </span>
              </div>
              <h4 className="text-lg font-display font-bold text-zinc-900 dark:text-white mb-2 leading-snug">Ultra human AI writing</h4>
              <p className="text-zinc-600 dark:text-sky-200/90 text-sm leading-relaxed">Natural, non-robotic copy. Reads like you wrote it — not like a template.</p>
            </div>

            <div className="group bg-white dark:bg-neutral-800/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col items-center text-center">
              <div className="h-12 flex items-center justify-center mb-4 w-full">
                <Image src="/gmail.png" alt="" width={32} height={32} className="w-8 h-8 object-contain" />
              </div>
              <h4 className="text-lg font-display font-bold text-zinc-900 dark:text-white mb-2 leading-snug">Gmail connection</h4>
              <p className="text-zinc-600 dark:text-sky-200/90 text-sm leading-relaxed">One-click connect. PipeShark works with your existing Gmail account — no new inbox. All drafts land in your Gmail draft folder, ready to review and send when you want. You stay in control.</p>
            </div>

            <div className="group bg-white dark:bg-neutral-800/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col items-center text-center">
              <div className="h-12 flex items-center justify-center mb-4 w-full">
                <Shield className="w-8 h-8 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
              </div>
              <h4 className="text-lg font-display font-bold text-zinc-900 dark:text-white mb-2 leading-snug">Drafts, not auto-send</h4>
              <p className="text-zinc-600 dark:text-sky-200/90 text-sm leading-relaxed">We create drafts instead of sending automatically to protect you from spam regulations. You decide when each email goes out.</p>
            </div>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-zinc-600 dark:text-sky-200/80">
            <span className="flex items-center gap-2"><Target className="w-4 h-4 text-sky-500 dark:text-sky-400" /> Automatic lead generation</span>
            <span className="flex items-center gap-2"><BarChart3 className="w-4 h-4 text-sky-500 dark:text-sky-400" /> Real-time tracking</span>
            <span className="flex items-center gap-2"><LayoutDashboard className="w-4 h-4 text-sky-500 dark:text-sky-400" /> Intuitive dashboard</span>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-zinc-100/60 dark:bg-black/40">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-3xl font-display font-bold text-zinc-900 dark:text-white text-center mb-12">
            How it works
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center bg-white dark:bg-neutral-800/60 rounded-2xl p-6 border border-zinc-200 dark:border-sky-700/40 shadow-sm">
              <div className="w-16 h-16 bg-sky-500/15 dark:bg-sky-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-sky-600 dark:text-sky-400">
                1
              </div>
              <h4 className="text-xl font-display font-bold text-zinc-900 dark:text-white mb-2">
                Create your campaign
              </h4>
              <p className="text-zinc-600 dark:text-sky-200/90">
                Define your business sector, company description, and targeting criteria for local businesses.
              </p>
            </div>

            <div className="text-center bg-white dark:bg-neutral-800/60 rounded-2xl p-6 border border-zinc-200 dark:border-sky-700/40 shadow-sm">
              <div className="w-16 h-16 bg-sky-500/15 dark:bg-sky-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-sky-600 dark:text-sky-400">
                2
              </div>
              <h4 className="text-xl font-display font-bold text-zinc-900 dark:text-white mb-2">
                PipeShark finds your leads
              </h4>
              <p className="text-zinc-600 dark:text-sky-200/90">
                Our system automatically searches for qualified local business prospects matching your criteria.
              </p>
            </div>

            <div className="text-center bg-white dark:bg-neutral-800/60 rounded-2xl p-6 border border-zinc-200 dark:border-sky-700/40 shadow-sm">
              <div className="w-16 h-16 bg-sky-500/15 dark:bg-sky-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-sky-600 dark:text-sky-400">
                3
              </div>
              <h4 className="text-xl font-display font-bold text-zinc-900 dark:text-white mb-2">
                Personalized emails
              </h4>
              <p className="text-zinc-600 dark:text-sky-200/90">
                Emails are automatically generated and personalized for each prospect.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-3xl font-display font-bold text-zinc-900 dark:text-white text-center mb-4">
            Simple pricing
          </h3>
          <p className="text-zinc-600 dark:text-sky-200/90 text-center mb-12 max-w-xl mx-auto">
            Choose the plan that fits your volume. Every email is unique and personalized for each prospect, with natural, human-sounding copy. All plans include lead generation and Daily Launch automation.
          </p>
          <div className="grid md:grid-cols-4 gap-6">
            {/* Free */}
            <div className="rounded-2xl border border-zinc-200 dark:border-sky-700/40 bg-white dark:bg-neutral-800/60 p-6 flex flex-col min-w-0 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-5 h-5 text-sky-500 dark:text-sky-400 shrink-0" />
                <h4 className="text-lg font-display font-bold text-zinc-900 dark:text-white">Free</h4>
              </div>
              <p className="text-zinc-600 dark:text-sky-300/90 text-sm mb-5">
                Full Standard features for <strong className="text-zinc-900 dark:text-white">7 days</strong>. No card required.
              </p>
              <ul className="space-y-3 text-sm text-zinc-600 dark:text-sky-200/90 mb-6 flex-1">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>Same features as Standard</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>7-day access only</span>
                </li>
              </ul>
              <Link
                href="/dashboard"
                className="block w-full text-center px-4 py-3 rounded-xl border border-sky-500 dark:border-sky-600 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/30 font-medium text-sm transition-colors mt-auto"
              >
                Start free trial
              </Link>
            </div>

            {/* Standard */}
            <div className="rounded-2xl border border-zinc-200 dark:border-sky-700/40 bg-white dark:bg-neutral-800/60 p-6 flex flex-col min-w-0 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-5 h-5 text-sky-500 dark:text-sky-400 shrink-0" />
                <h4 className="text-lg font-display font-bold text-zinc-900 dark:text-white">Standard</h4>
              </div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white mb-5">
                $19<span className="text-sm font-normal text-zinc-500 dark:text-sky-300">/month</span>
              </p>
              <ul className="space-y-3 text-sm text-zinc-600 dark:text-sky-200/90 mb-6 flex-1">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong className="text-zinc-900 dark:text-white">1,000</strong> AI emails/month (30/day)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>Unique, human-sounding email per prospect</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>Email, phone, URL per lead</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong className="text-zinc-900 dark:text-white">Daily Launch</strong> — automatic every day</span>
                </li>
              </ul>
              <Link
                href="https://buy.stripe.com/28E14ndf425P7p9d6GcIE00"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center px-4 py-3 rounded-xl bg-sky-500 hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-500 text-white font-semibold text-sm transition-colors mt-auto"
              >
                Get Standard
              </Link>
            </div>

            {/* Pro */}
            <div className="rounded-2xl border-2 border-sky-500 dark:border-sky-400 bg-sky-50/80 dark:bg-sky-950/30 p-6 flex flex-col relative min-w-0 shadow-sm">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-sky-500 dark:bg-sky-600 text-white text-xs font-semibold rounded-full">
                Most popular
              </span>
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-5 h-5 text-sky-500 dark:text-sky-400 shrink-0" />
                <h4 className="text-lg font-display font-bold text-zinc-900 dark:text-white">Pro</h4>
              </div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white mb-5">
                $39<span className="text-sm font-normal text-zinc-500 dark:text-sky-300">/month</span>
              </p>
              <ul className="space-y-3 text-sm text-zinc-600 dark:text-sky-200/90 mb-6 flex-1">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>Connect up to 3 email accounts — <strong className="text-zinc-900 dark:text-white">3,000</strong> AI emails/month (90/day)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>Unique, human-sounding email per prospect</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>Same as Standard + Daily Launch</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>For teams or heavy users</span>
                </li>
              </ul>
              <Link
                href="https://buy.stripe.com/aFabJ1b6WfWFgZJ3w6cIE01"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center px-4 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 dark:bg-sky-600 dark:hover:bg-sky-500 text-white font-semibold text-sm transition-colors mt-auto"
              >
                Get Pro
              </Link>
            </div>

            {/* Business */}
            <div className="rounded-2xl border border-zinc-200 dark:border-sky-700/40 bg-white dark:bg-neutral-800/60 p-6 flex flex-col min-w-0 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-5 h-5 text-sky-500 dark:text-sky-400 shrink-0" />
                <h4 className="text-lg font-display font-bold text-zinc-900 dark:text-white">Business</h4>
              </div>
              <p className="text-zinc-600 dark:text-sky-300/90 text-sm mb-5">
                Custom volume, dedicated support. Tell us your needs.
              </p>
              <ul className="space-y-3 text-sm text-zinc-600 dark:text-sky-200/90 mb-6 flex-1">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>Custom email volume</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>All Pro + priority support</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>Agencies & large teams</span>
                </li>
              </ul>
              <Link
                href="mailto:hello@pipeshark.com?subject=Business plan"
                className="block w-full text-center px-4 py-3 rounded-xl border border-sky-500 dark:border-sky-600 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/30 font-medium text-sm transition-colors mt-auto"
              >
                Contact us
              </Link>
            </div>
          </div>

          {/* Promo code */}
          <div className="mt-12 p-6 rounded-2xl border border-zinc-200 dark:border-sky-700/50 bg-white dark:bg-neutral-800/60 max-w-md mx-auto shadow-sm">
            <p className="text-zinc-900 dark:text-sky-200 font-semibold mb-3 flex items-center justify-center gap-2">
              <Ticket className="w-5 h-5 text-sky-500 dark:text-sky-400" />
              Have a promo code?
            </p>
            <p className="text-zinc-600 dark:text-sky-300/80 text-sm text-center mb-4">
              Enter your code to activate the Standard or Pro plan for free.
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setPromoError(null);
                setPromoSuccess(null);
                if (!promoCode.trim()) return;
                setPromoLoading(true);
                try {
                  const res = await fetch('/api/promo/redeem', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ code: promoCode.trim() }),
                  });
                  const data = await res.json().catch(() => ({}));
                  if (res.status === 401) {
                    setPromoError('Log in to activate this code.');
                    return;
                  }
                  if (!res.ok) {
                    setPromoError(data?.error || 'Invalid code.');
                    return;
                  }
                  setPromoSuccess(data?.message || 'Plan activated.');
                  setPromoCode('');
                } catch {
                  setPromoError('Something went wrong. Please try again.');
                } finally {
                  setPromoLoading(false);
                }
              }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                placeholder="Promo code"
                className="flex-1 px-4 py-3 rounded-xl bg-zinc-50 dark:bg-neutral-800 border border-zinc-200 dark:border-sky-700/50 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-sky-400/60 focus:outline-none focus:ring-2 focus:ring-sky-500"
                disabled={promoLoading}
                maxLength={20}
              />
              <button
                type="submit"
                disabled={promoLoading || !promoCode.trim()}
                className="px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-500 text-white font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {promoLoading ? 'Activating...' : 'Activate'}
              </button>
            </form>
            {promoError && (
              <p className="mt-3 text-sm text-amber-400 text-center">
                {promoError}
                {promoError.includes('Log in') && (
                  <Link href="/dashboard" className="block mt-2 text-sky-500 dark:text-sky-400 hover:text-sky-600 dark:hover:text-sky-300 underline">
                    Go to dashboard →
                  </Link>
                )}
              </p>
            )}
            {promoSuccess && (
              <p className="mt-3 text-sm text-emerald-400 text-center font-medium">{promoSuccess}</p>
            )}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8 bg-zinc-100/60 dark:bg-black/40 scroll-mt-20">
        <div className="max-w-3xl mx-auto">
          <h3 className="text-3xl font-display font-bold text-zinc-900 dark:text-white text-center mb-10">
            Frequently asked questions
          </h3>
          <dl className="space-y-6">
            <div className="rounded-2xl border border-zinc-200 dark:border-sky-700/40 bg-white dark:bg-neutral-800/60 p-5 shadow-sm">
              <dt className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">What is PipeShark?</dt>
              <dd className="text-zinc-600 dark:text-sky-200/90 text-sm">
                PipeShark is an automated prospecting tool for local and trade businesses (plumbers, electricians, HVAC, etc.). It finds qualified leads based on your sector and location, generates AI-personalized email drafts for each prospect, and drops them directly into your Gmail drafts so you can review and send when you want. You stay in control while saving hours of research and writing.
              </dd>
            </div>
            <div className="rounded-2xl border border-zinc-200 dark:border-sky-700/40 bg-white dark:bg-neutral-800/60 p-5 shadow-sm">
              <dt className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">Why drafts instead of sending emails automatically?</dt>
              <dd className="text-zinc-600 dark:text-sky-200/90 text-sm">
                We create drafts in your Gmail instead of sending automatically to protect you from spam regulations and sender reputation issues. You review each message, tweak it if needed, and hit send yourself. That way you stay compliant and keep a human in the loop while still benefiting from automation.
              </dd>
            </div>
            <div className="rounded-2xl border border-zinc-200 dark:border-sky-700/40 bg-white dark:bg-neutral-800/60 p-5 shadow-sm">
              <dt className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">What is Daily Launch?</dt>
              <dd className="text-zinc-600 dark:text-sky-200/90 text-sm">
                Daily Launch lets you set a time (e.g. 9:00) once. Every day at that time, PipeShark automatically runs your selected campaigns: it finds leads, generates personalized drafts, and adds them to your Gmail draft folder. You don’t need to open PipeShark — it runs in the background so you get a fresh batch of drafts every day without lifting a finger.
              </dd>
            </div>
            <div className="rounded-2xl border border-zinc-200 dark:border-sky-700/40 bg-white dark:bg-neutral-800/60 p-5 shadow-sm">
              <dt className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">How does the AI personalize my emails?</dt>
              <dd className="text-zinc-600 dark:text-sky-200/90 text-sm">
                You provide a business description (what you do, who you serve) and optionally an example email in your style. The AI uses that plus each lead’s business type and location to write unique, human-sounding emails. The tone can be professional, casual, or direct — you choose. No generic templates: each draft is tailored to the prospect and your brand.
              </dd>
            </div>
            <div className="rounded-2xl border border-zinc-200 dark:border-sky-700/40 bg-white dark:bg-neutral-800/60 p-5 shadow-sm">
              <dt className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">What do I get for each lead?</dt>
              <dd className="text-zinc-600 dark:text-sky-200/90 text-sm">
                For every lead we find, you get: email address, phone number, and website URL when available. The lead is added to your campaign in PipeShark with an AI-generated email draft. You can see all leads in your dashboard, filter by reply status, and track which prospects have answered.
              </dd>
            </div>
            <div className="rounded-2xl border border-zinc-200 dark:border-sky-700/40 bg-white dark:bg-neutral-800/60 p-5 shadow-sm">
              <dt className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">Do I need to connect Gmail?</dt>
              <dd className="text-zinc-600 dark:text-sky-200/90 text-sm">
                Yes. PipeShark works with your existing Gmail account. You connect it once; we then create drafts in your Gmail draft folder and can detect when a prospect replies so we can mark them as “Replied” in your dashboard. Your emails stay in your inbox — no separate tool to check.
              </dd>
            </div>
            <div className="rounded-2xl border border-zinc-200 dark:border-sky-700/40 bg-white dark:bg-neutral-800/60 p-5 shadow-sm">
              <dt className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">What are credits and how do they work?</dt>
              <dd className="text-zinc-600 dark:text-sky-200/90 text-sm">
                One credit = one lead (and one AI-generated draft). Your plan has a monthly limit (e.g. 1,000 or 3,000) and a daily cap so you don’t burn through everything at once. Credits reset every day; you choose how many leads per campaign and when Daily Launch runs. The dashboard shows how many you’ve used today and how many remain.
              </dd>
            </div>
            <div className="rounded-2xl border border-zinc-200 dark:border-sky-700/40 bg-white dark:bg-neutral-800/60 p-5 shadow-sm">
              <dt className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">Who is PipeShark for?</dt>
              <dd className="text-zinc-600 dark:text-sky-200/90 text-sm">
                PipeShark is built for local service and trade businesses (plumbers, electricians, HVAC, contractors, etc.) that want to prospect consistently without spending hours on research and cold emails. If you target businesses by sector and location and want personalized outreach at scale, PipeShark fits. It’s especially useful if you already use Gmail and prefer to send from your own account.
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-4xl font-display font-bold text-zinc-900 dark:text-white mb-6">
            Ready to prospect local businesses on autopilot?
          </h3>
          <p className="text-xl text-zinc-600 dark:text-sky-200/90 mb-8">
            Join PipeShark and automate your lead generation today.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-4 bg-sky-500 hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-500 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200"
          >
            Get started now
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Article previews – click to read full article */}
      <section id="article" className="py-16 px-4 sm:px-6 lg:px-8 border-t border-zinc-200 dark:border-sky-800/50">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-zinc-500 dark:text-sky-400 text-sm font-medium mb-8">Read our article</p>
          <div className="max-w-xl mx-auto">
            <Link
              href="/article"
              className="block group rounded-2xl overflow-hidden border border-zinc-200 dark:border-sky-700/40 bg-white dark:bg-neutral-800/60 hover:border-sky-500/50 transition-all duration-300 hover:shadow-xl shadow-sm"
            >
              <div className="aspect-video bg-zinc-200 dark:bg-zinc-800 overflow-hidden relative">
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
                <h2 className="text-lg md:text-xl font-display font-bold text-zinc-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                  AI Automation in Blue-Collar Trades: Hype or Essential Next Step?
                </h2>
                <p className="mt-2 text-zinc-600 dark:text-sky-300/90 text-sm">
                  How AI is reshaping the skilled trades – and why it matters for PipeShark.
                </p>
                <span className="inline-flex items-center gap-2 mt-3 text-sky-500 dark:text-sky-400 group-hover:text-sky-600 dark:group-hover:text-sky-300 text-sm font-medium">
                  Read full article
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white dark:bg-neutral-900 border-t border-zinc-200 dark:border-sky-800/50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <ViperLogo className="h-16 w-auto flex-shrink-0 min-w-16" />
            <h4 className="text-xl font-brand font-bold tracking-wide text-zinc-900 dark:text-white">Pipeshark</h4>
          </div>
          <p className="text-zinc-500 dark:text-sky-500 text-sm">
            Automated prospecting for local businesses
          </p>
          <p className="mt-3 text-zinc-600 dark:text-sky-400/90 text-sm">
            <a href="mailto:hello@pipeshark.io" className="hover:text-sky-600 dark:hover:text-sky-300 underline">
              hello@pipeshark.io
            </a>
          </p>
        </div>
      </footer>
      </div>
    </div>
  );
}
