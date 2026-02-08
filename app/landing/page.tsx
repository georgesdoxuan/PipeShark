'use client';

import { Target, Zap, Mail, BarChart3, Shield, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import ViperLogo from '@/components/ViperLogo';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-sky-950 to-black">
      {/* Header */}
      <header className="bg-black/90 backdrop-blur-sm border-b border-sky-900 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ViperLogo className="w-8 h-8 text-sky-600" />
              <h1 className="text-2xl font-brand font-bold tracking-wide"><span className="text-white">Pipe</span><span className="text-sky-400">Shark</span></h1>
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
            Automatisez votre prospection
            <br />
            <span className="text-sky-500">sans effort</span>
          </h2>
          <p className="text-xl text-sky-200/90 mb-8 max-w-2xl mx-auto">
            PipeShark génère automatiquement des leads qualifiés et personnalise vos emails pour transformer vos prospects en clients.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-4 bg-sky-700 hover:bg-sky-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            Accéder à My Space
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-3xl font-display font-bold text-white text-center mb-12">
            Tout ce dont vous avez besoin
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-black/50 rounded-xl p-6 border border-sky-900">
              <div className="w-12 h-12 bg-sky-800 rounded-lg flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-sky-300" />
              </div>
              <h4 className="text-xl font-display font-bold text-white mb-2">
                Génération de leads automatique
              </h4>
              <p className="text-sky-200/90">
                Trouvez automatiquement des prospects qualifiés selon votre secteur d'activité et votre zone géographique.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-black/50 rounded-xl p-6 border border-sky-900">
              <div className="w-12 h-12 bg-sky-800 rounded-lg flex items-center justify-center mb-4">
                <Mail className="w-6 h-6 text-sky-300" />
              </div>
              <h4 className="text-xl font-display font-bold text-white mb-2">
                Emails personnalisés
              </h4>
              <p className="text-sky-200/90">
                Vos emails sont générés automatiquement et personnalisés selon votre entreprise et vos services.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-black/50 rounded-xl p-6 border border-sky-900">
              <div className="w-12 h-12 bg-sky-800 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-sky-300" />
              </div>
              <h4 className="text-xl font-display font-bold text-white mb-2">
                Suivi en temps réel
              </h4>
              <p className="text-sky-200/90">
                Suivez vos campagnes, vos leads et vos performances avec des statistiques détaillées.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-black/50 rounded-xl p-6 border border-sky-900">
              <div className="w-12 h-12 bg-sky-800 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-sky-300" />
              </div>
              <h4 className="text-xl font-display font-bold text-white mb-2">
                Rapide et efficace
              </h4>
              <p className="text-sky-200/90">
                Lancez vos campagnes en quelques clics et laissez PipeShark faire le travail pour vous.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-black/50 rounded-xl p-6 border border-sky-900">
              <div className="w-12 h-12 bg-sky-800 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-sky-300" />
              </div>
              <h4 className="text-xl font-display font-bold text-white mb-2">
                Limite quotidienne
              </h4>
              <p className="text-sky-200/90">
                Système de crédits quotidiens pour gérer votre usage et optimiser vos campagnes.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-black/50 rounded-xl p-6 border border-sky-900">
              <div className="w-12 h-12 bg-sky-800 rounded-lg flex items-center justify-center mb-4">
                <ViperLogo className="w-6 h-6 text-sky-500" />
              </div>
              <h4 className="text-xl font-display font-bold text-white mb-2">
                Interface intuitive
              </h4>
              <p className="text-sky-200/90">
                Une interface moderne et simple pour gérer toutes vos campagnes de prospection.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-black/40">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-3xl font-display font-bold text-white text-center mb-12">
            Comment ça marche
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-sky-800 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-white">
                1
              </div>
              <h4 className="text-xl font-display font-bold text-white mb-2">
                Créez votre campagne
              </h4>
              <p className="text-sky-200/90">
                Définissez votre secteur d'activité, votre description d'entreprise et vos critères de ciblage.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-sky-800 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-white">
                2
              </div>
              <h4 className="text-xl font-display font-bold text-white mb-2">
                PipeShark trouve vos leads
              </h4>
              <p className="text-sky-200/90">
                Notre système recherche automatiquement des prospects qualifiés correspondant à vos critères.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-sky-800 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-white">
                3
              </div>
              <h4 className="text-xl font-display font-bold text-white mb-2">
                Emails personnalisés
              </h4>
              <p className="text-sky-200/90">
                Des emails sont générés automatiquement et personnalisés pour chaque prospect.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-4xl font-display font-bold text-white mb-6">
            Prêt à transformer votre prospection ?
          </h3>
          <p className="text-xl text-sky-200/90 mb-8">
            Rejoignez PipeShark et automatisez votre génération de leads dès aujourd'hui.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-4 bg-sky-700 hover:bg-sky-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            Commencer maintenant
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
            Outil de prospection automatisée
          </p>
        </div>
      </footer>
    </div>
  );
}
