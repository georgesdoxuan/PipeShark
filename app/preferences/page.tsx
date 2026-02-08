'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { Settings, ArrowLeft, MailCheck, MailX } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function PreferencesPage() {
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);
  const [gmailLoading, setGmailLoading] = useState(true);
  const [gmailDisconnecting, setGmailDisconnecting] = useState(false);
  const [gmailError, setGmailError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  async function fetchGmailStatus() {
    setGmailLoading(true);
    setGmailError(null);
    try {
      const res = await fetch('/api/auth/gmail/status', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setGmailConnected(data.gmailConnected || false);
        setGmailEmail(data.gmailEmail || null);
      } else {
        setGmailConnected(false);
        setGmailEmail(null);
      }
    } catch {
      setGmailConnected(false);
      setGmailEmail(null);
    } finally {
      setGmailLoading(false);
    }
  }

  useEffect(() => {
    fetchGmailStatus();
  }, []);

  useEffect(() => {
    const connected = searchParams.get('gmail_connected');
    const error = searchParams.get('gmail_error');
    if (connected === '1') {
      fetchGmailStatus();
      window.history.replaceState({}, '', '/preferences');
    }
    if (error) {
      const messages: Record<string, string> = {
        save_failed: 'Impossible de sauvegarder les tokens Gmail. La table user_profiles existe-t-elle ? Exécutez la migration Supabase.',
        unauthorized: 'Session expirée pendant la connexion. Réessayez.',
        token_exchange: 'Échec de l\'échange du code OAuth. Vérifiez la configuration.',
        config: 'Configuration OAuth manquante.',
        invalid_state: 'État OAuth invalide.',
        missing_params: 'Paramètres OAuth manquants.',
      };
      setGmailError(messages[error] || `Erreur Gmail: ${error}`);
      window.history.replaceState({}, '', '/preferences');
    }
  }, [searchParams]);

  const handleConnectGmail = () => {
    window.location.href = '/api/auth/gmail?return_to=/preferences';
  };

  const handleDisconnectGmail = async () => {
    setGmailDisconnecting(true);
    try {
      const res = await fetch('/api/auth/gmail/disconnect', { method: 'POST' });
      if (res.ok) {
        setGmailConnected(false);
        setGmailEmail(null);
      }
    } catch {
      // Ignore
    } finally {
      setGmailDisconnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black relative">
      <div className="relative z-10">
        <Header />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-neutral-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6 mb-6">
            <h1 className="text-2xl font-display font-bold text-white mb-6 flex items-center gap-2">
              <Settings className="w-6 h-6" />
              Preferences
            </h1>

            {/* Gmail Connection Section - always visible in preferences */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-white mb-3">Connexion Gmail</h2>
              {gmailError && (
                <div className="mb-4 bg-red-900/20 border border-red-700/50 rounded-xl p-4 flex items-start justify-between gap-4">
                  <p className="text-sm text-red-200">{gmailError}</p>
                  <button
                    onClick={() => setGmailError(null)}
                    className="text-red-400 hover:text-red-300 text-sm shrink-0"
                  >
                    Fermer
                  </button>
                </div>
              )}
              {!gmailLoading && (
                <>
                  {!gmailConnected ? (
                    <div className="bg-amber-900/20 border border-amber-700/50 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <MailX className="w-5 h-5 text-amber-400" />
                        <div>
                          <p className="font-semibold text-amber-200">Compte Gmail non connecté</p>
                          <p className="text-sm text-amber-200/80">
                            Connectez votre Gmail pour recevoir les drafts d&apos;emails générés dans votre boîte mail
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleConnectGmail}
                        className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl font-semibold transition-colors"
                      >
                        <MailCheck className="w-4 h-4" />
                        Connecter Gmail
                      </button>
                    </div>
                  ) : (
                    <div className="bg-sky-900/20 border border-sky-700/50 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <MailCheck className="w-5 h-5 text-sky-400" />
                        <div>
                          <p className="font-semibold text-sky-200">Gmail connecté</p>
                          <p className="text-sm text-sky-200/80">
                            Compte : {gmailEmail || '—'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleDisconnectGmail}
                        disabled={gmailDisconnecting}
                        className="text-red-400 hover:text-red-300 text-sm underline disabled:opacity-50"
                      >
                        {gmailDisconnecting ? 'Déconnexion...' : 'Déconnecter'}
                      </button>
                    </div>
                  )}
                </>
              )}
              {gmailLoading && (
                <p className="text-neutral-400 text-sm">Chargement...</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
