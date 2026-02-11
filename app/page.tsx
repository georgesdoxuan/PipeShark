'use client';

import { Target, Zap, Mail, BarChart3, Shield, ArrowRight } from 'lucide-react';
import ViperLogo from '@/components/ViperLogo';
import Link from 'next/link';
import { useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

// Fish component with different shapes
function SwimmingFish({ delay, duration, top, size, direction, shapeIndex }: { delay: number; duration: number; top: string; size: string; direction: 'left' | 'right'; shapeIndex: number }) {
  const fishShapes = [
    // Fish shape 1 - simple oval (darker blue)
    <svg key="1" width={size} height={size} viewBox="0 0 100 60" className={direction === 'right' ? '' : 'scale-x-[-1]'}>
      <ellipse cx="50" cy="30" rx="40" ry="25" fill="#0c4a6e" opacity="0.75" />
      <polygon points="10,30 0,20 0,40" fill="#0c4a6e" opacity="0.75" />
      <circle cx="65" cy="25" r="3" fill="#0369a1" opacity="0.85" />
    </svg>,
    // Fish shape 2 - more detailed (darker blue)
    <svg key="2" width={size} height={size} viewBox="0 0 100 60" className={direction === 'right' ? '' : 'scale-x-[-1]'}>
      <ellipse cx="50" cy="30" rx="35" ry="20" fill="#0c4a6e" opacity="0.7" />
      <polygon points="15,30 5,15 5,45" fill="#0c4a6e" opacity="0.7" />
      <ellipse cx="60" cy="28" rx="8" ry="6" fill="#0369a1" opacity="0.8" />
      <circle cx="70" cy="22" r="2" fill="#0ea5e9" opacity="0.9" />
    </svg>,
    // Fish shape 3 - streamlined (darker blue)
    <svg key="3" width={size} height={size} viewBox="0 0 100 60" className={direction === 'right' ? '' : 'scale-x-[-1]'}>
      <path d="M 20 30 Q 50 10 80 30 Q 50 50 20 30" fill="#0c4a6e" opacity="0.75" />
      <polygon points="20,30 10,25 10,35" fill="#0c4a6e" opacity="0.75" />
      <circle cx="70" cy="28" r="4" fill="#0369a1" opacity="0.85" />
    </svg>,
    // Fish shape 4 - round (darker blue)
    <svg key="4" width={size} height={size} viewBox="0 0 100 60" className={direction === 'right' ? '' : 'scale-x-[-1]'}>
      <ellipse cx="45" cy="30" rx="30" ry="22" fill="#0c4a6e" opacity="0.7" />
      <polygon points="15,30 8,20 8,40" fill="#0c4a6e" opacity="0.7" />
      <circle cx="55" cy="25" r="3" fill="#0369a1" opacity="0.8" />
      <path d="M 65 20 Q 70 25 65 30" fill="#0ea5e9" opacity="0.75" />
    </svg>,
    // Fish shape 5 - elongated (darker blue)
    <svg key="5" width={size} height={size} viewBox="0 0 100 60" className={direction === 'right' ? '' : 'scale-x-[-1]'}>
      <ellipse cx="50" cy="30" rx="42" ry="18" fill="#0c4a6e" opacity="0.65" />
      <polygon points="8,30 0,22 0,38" fill="#0c4a6e" opacity="0.65" />
      <circle cx="68" cy="26" r="3" fill="#0369a1" opacity="0.75" />
      <ellipse cx="75" cy="30" rx="4" ry="8" fill="#0ea5e9" opacity="0.65" />
    </svg>,
  ];

  const selectedShape = fishShapes[shapeIndex % fishShapes.length];
  
  return (
    <div 
      className={`absolute ${direction === 'right' ? 'animate-swim-right' : 'animate-swim-left'}`}
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
  const router = useRouter();

  // Redirect to dashboard if user is logged in
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.replace('/dashboard');
      }
    });
  }, [router]);

  // Generate bubbles positions once (exactly like in dashboard)
  const bubbles = useMemo(() => {
    return Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 10,
      duration: 12 + Math.random() * 8,
      size: i % 3,
    }));
  }, []);

  // Generate fish with random positions and timings (memoized to avoid regeneration) - fewer fish
  const fishes = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      id: i,
      delay: Math.random() * 5, // Shorter delay so they start moving quickly
      duration: 15 + Math.random() * 20, // 15-35 seconds
      top: `${10 + Math.random() * 80}%`,
      size: `${20 + Math.random() * 40}px`, // 20-60px
      direction: Math.random() > 0.5 ? 'right' : 'left' as 'left' | 'right',
      shapeIndex: Math.floor(Math.random() * 5),
    }));
  }, []);

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Bubbles background (smaller for landing page) */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {bubbles.map((bubble) => (
          <div
            key={bubble.id}
            className={`bubble bubble-landing-${bubble.size}`}
            style={{
              left: `${bubble.left}%`,
              animationDelay: `${bubble.delay}s`,
              animationDuration: `${bubble.duration}s`,
            }}
          ></div>
        ))}
      </div>

      {/* Animated Fish Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
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
      
      {/* Content with relative z-index */}
      <div className="relative z-10">
        {/* Header */}
      <header className="bg-black/90 backdrop-blur-sm border-b border-sky-900 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ViperLogo className="w-8 h-8 text-sky-600" />
              <h1 className="text-2xl font-brand font-bold tracking-wide"><span className="text-white">Pipe</span><span className="text-sky-400">Shark</span></h1>
            </div>
            <Link
              href="/login"
              className="flex items-center gap-2 px-4 py-2 bg-sky-700 hover:bg-sky-600 text-white rounded-lg font-semibold transition-colors"
            >
              Sign in
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-display font-bold text-white mb-6">
            Automate your prospecting
            <br />
            <span className="text-sky-500">effortlessly</span>
          </h2>
          <p className="text-xl text-sky-200/90 mb-8 max-w-2xl mx-auto">
            PipeShark automatically generates qualified leads and personalizes your emails to turn prospects into customers.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-4 bg-sky-700 hover:bg-sky-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            Sign in
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-3xl font-display font-bold text-white text-center mb-12">
            Everything you need
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-black/50 rounded-xl p-6 border border-sky-900">
              <div className="w-12 h-12 bg-sky-800 rounded-lg flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-sky-300" />
              </div>
              <h4 className="text-xl font-display font-bold text-white mb-2">
                Automatic lead generation
              </h4>
              <p className="text-sky-200/90">
                Automatically find qualified prospects based on your business sector and geographic area.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-black/50 rounded-xl p-6 border border-sky-900">
              <div className="w-12 h-12 bg-sky-800 rounded-lg flex items-center justify-center mb-4">
                <Mail className="w-6 h-6 text-sky-300" />
              </div>
              <h4 className="text-xl font-display font-bold text-white mb-2">
                Personalized emails
              </h4>
              <p className="text-sky-200/90">
                Your emails are automatically generated and personalized based on your company and services.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-black/50 rounded-xl p-6 border border-sky-900">
              <div className="w-12 h-12 bg-sky-800 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-sky-300" />
              </div>
              <h4 className="text-xl font-display font-bold text-white mb-2">
                Real-time tracking
              </h4>
              <p className="text-sky-200/90">
                Track your campaigns, leads, and performance with detailed statistics.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-black/50 rounded-xl p-6 border border-sky-900">
              <div className="w-12 h-12 bg-sky-800 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-sky-300" />
              </div>
              <h4 className="text-xl font-display font-bold text-white mb-2">
                Fast and efficient
              </h4>
              <p className="text-sky-200/90">
                Launch your campaigns in just a few clicks and let PipeShark do the work for you.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-black/50 rounded-xl p-6 border border-sky-900">
              <div className="w-12 h-12 bg-sky-800 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-sky-300" />
              </div>
              <h4 className="text-xl font-display font-bold text-white mb-2">
                Daily limit
              </h4>
              <p className="text-sky-200/90">
                Daily credit system to manage your usage and optimize your campaigns.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-black/50 rounded-xl p-6 border border-sky-900">
              <div className="w-12 h-12 bg-sky-800 rounded-lg flex items-center justify-center mb-4">
                <ViperLogo className="w-6 h-6 text-sky-500" />
              </div>
              <h4 className="text-xl font-display font-bold text-white mb-2">
                Intuitive interface
              </h4>
              <p className="text-sky-200/90">
                A modern and simple interface to manage all your prospecting campaigns.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-black/40">
        <div className="max-w-7xl mx-auto">
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

      {/* Article preview – click to read full article */}
      <section id="article" className="py-16 px-4 sm:px-6 lg:px-8 bg-black/40">
        <div className="max-w-2xl mx-auto">
          <p className="text-center text-sky-400 text-sm font-medium mb-6">Read our article</p>
          <Link
            href="/article"
            className="block group rounded-2xl overflow-hidden border border-sky-800/50 bg-black/40 hover:bg-sky-900/30 transition-all duration-300 hover:border-sky-600/50 hover:shadow-xl hover:shadow-sky-900/20"
          >
            <div className="aspect-video bg-zinc-800 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={process.env.NEXT_PUBLIC_ARTICLE_IMAGE_URL || 'https://syjzqkweivjswszwrvye.supabase.co/storage/v1/object/public/Articles/Article1/plumber-automation-process.jpg'}
                alt="AI Automation in Blue-Collar Trades"
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
              />
            </div>
            <div className="p-6">
              <h2 className="text-xl md:text-2xl font-display font-bold text-white group-hover:text-sky-200 transition-colors">
                AI Automation in Blue-Collar Trades: Hype or Essential Next Step?
              </h2>
              <p className="mt-2 text-sky-300/90 text-sm">
                How AI is reshaping the skilled trades – and why it matters for PipeShark.
              </p>
              <span className="inline-flex items-center gap-2 mt-4 text-sky-400 group-hover:text-sky-300 text-sm font-medium">
                Read full article
                <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </Link>
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
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-sky-700 hover:bg-sky-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            Get started now
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black border-t border-sky-900 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <ViperLogo className="w-6 h-6 text-sky-600" />
            <h4 className="text-xl font-brand font-bold tracking-wide"><span className="text-white">Pipe</span><span className="text-sky-400">Shark</span></h4>
          </div>
          <p className="text-sky-500 text-sm">
            Automated prospecting tool
          </p>
      </div>
      </footer>
      </div>
    </div>
  );
}
