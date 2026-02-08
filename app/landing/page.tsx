'use client';

import { Target, Zap, Mail, BarChart3, Shield, ArrowRight, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import ViperLogo from '@/components/ViperLogo';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-sky-950 to-black">
      {/* Header */}
      <header className="bg-black/90 backdrop-blur-sm border-b border-sky-900 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ViperLogo className="h-16 w-auto flex-shrink-0 min-w-16" />
              <h1 className="text-2xl font-brand font-bold tracking-wide text-white">PipeShark</h1>
            </div>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-4 py-2 bg-sky-700 hover:bg-sky-600 text-white rounded-lg font-semibold transition-colors"
            >
              My Space
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
          <p className="text-xl text-sky-200/90 mb-4 max-w-2xl mx-auto">
            PipeShark prospects <strong className="text-white">blue collar</strong> and <strong className="text-white">grey collar</strong> for you, generates qualified leads and personalizes your emails to turn prospects into customers.
          </p>
          <p className="text-lg text-sky-300/80 mb-8">
            Up to <strong className="text-sky-400">1000 emails</strong> per month.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-4 bg-sky-700 hover:bg-sky-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            Go to My Space
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

            <div className="bg-black/50 rounded-xl p-6 border border-sky-900">
              <div className="w-12 h-12 bg-sky-800 rounded-lg flex items-center justify-center mb-4">
                <LayoutDashboard className="w-6 h-6 text-sky-300" />
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

      {/* Footer */}
      <footer className="bg-black border-t border-sky-900 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
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
