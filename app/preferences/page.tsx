'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { Settings, MailCheck, MailX, Scale, Lock, Send, FileText, Trash2, Pencil } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import SenderAccountForm from '@/components/SenderAccountForm';

interface SenderAccountPublic {
  id: string;
  email: string;
  smtpHost: string;
  smtpPort: number;
  isPrimary: boolean;
  createdAt: string;
  smtpPassword?: string;
}

export default function PreferencesPage() {
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);
  const [gmailLoading, setGmailLoading] = useState(true);
  const [gmailDisconnecting, setGmailDisconnecting] = useState(false);
  const [gmailError, setGmailError] = useState<string | null>(null);
  const [gmailAccounts, setGmailAccounts] = useState<{ email: string; connected: boolean }[]>([]);
  const [plan, setPlan] = useState<string | null>(null);
  const [canAddMoreGmail, setCanAddMoreGmail] = useState(false);
  const [senderAccounts, setSenderAccounts] = useState<SenderAccountPublic[]>([]);
  const [senderAccountsLoading, setSenderAccountsLoading] = useState(true);
  const [mailConnectionType, setMailConnectionType] = useState<'smtp' | 'gmail'>('smtp');
  const [mailConnectionLoading, setMailConnectionLoading] = useState(true);
  const [mailConnectionSaving, setMailConnectionSaving] = useState(false);
  const [presets, setPresets] = useState<{ id: string; name: string; businessType?: string; createdAt: string }[]>([]);
  const [presetsLoading, setPresetsLoading] = useState(true);
  const [renamingPresetId, setRenamingPresetId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
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
    fetch('/api/gmail/accounts', { credentials: 'include' })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.accounts) setGmailAccounts(d.accounts);
        if (d?.plan) setPlan(d.plan);
        if (typeof d?.canAddMore === 'boolean') setCanAddMoreGmail(d.canAddMore);
      })
      .catch(() => {});
  }, []);

  function fetchSenderAccounts() {
    setSenderAccountsLoading(true);
    fetch('/api/sender-accounts?withPasswords=1', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.accounts) setSenderAccounts(d.accounts);
        else setSenderAccounts([]);
      })
      .catch(() => setSenderAccounts([]))
      .finally(() => setSenderAccountsLoading(false));
  }

  useEffect(() => {
    fetchSenderAccounts();
  }, []);

  useEffect(() => {
    fetch('/api/preferences/mail-connection', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.mail_connection_type === 'gmail') setMailConnectionType('gmail');
        else setMailConnectionType('smtp');
      })
      .catch(() => {})
      .finally(() => setMailConnectionLoading(false));
  }, []);

  function fetchPresets() {
    setPresetsLoading(true);
    fetch('/api/campaign-presets', { credentials: 'include' })
      .then((r) => r.ok ? r.json() : [])
      .then((d) => setPresets(Array.isArray(d) ? d : []))
      .catch(() => setPresets([]))
      .finally(() => setPresetsLoading(false));
  }

  useEffect(() => {
    fetchPresets();
  }, []);

  async function deletePreset(presetId: string) {
    const res = await fetch(`/api/campaign-presets/${presetId}`, { method: 'DELETE', credentials: 'include' });
    if (res.ok) {
      setPresets((prev) => prev.filter((p) => p.id !== presetId));
    }
  }

  async function renamePreset(presetId: string, newName: string) {
    if (!newName.trim()) return;
    const res = await fetch(`/api/campaign-presets/${presetId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (res.ok) {
      setPresets((prev) => prev.map((p) => p.id === presetId ? { ...p, name: newName.trim() } : p));
      setRenamingPresetId(null);
      setRenameValue('');
    }
  }

  async function setMailConnection(value: 'smtp' | 'gmail') {
    setMailConnectionSaving(true);
    try {
      const res = await fetch('/api/preferences/mail-connection', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mail_connection_type: value }),
      });
      if (res.ok) {
        setMailConnectionType(value);
      }
    } finally {
      setMailConnectionSaving(false);
    }
  }

  useEffect(() => {
    const connected = searchParams.get('gmail_connected');
    const added = searchParams.get('added');
    const error = searchParams.get('gmail_error');
    if (connected === '1' || added === 'secondary') {
      fetchGmailStatus();
      fetch('/api/gmail/accounts', { credentials: 'include' })
        .then((r) => r.ok ? r.json() : null)
        .then((d) => {
          if (d?.accounts) setGmailAccounts(d.accounts);
          if (d?.plan) setPlan(d.plan);
          if (typeof d?.canAddMore === 'boolean') setCanAddMoreGmail(d.canAddMore);
        })
        .catch(() => {});
      window.history.replaceState({}, '', '/preferences');
    }
    if (error) {
      const messages: Record<string, string> = {
        save_failed: 'Could not save Gmail tokens. Run the Supabase migration if needed.',
        unauthorized: 'Session expired during sign-in. Try again.',
        token_exchange: 'OAuth code exchange failed. Check configuration.',
        config: 'Missing OAuth configuration.',
        invalid_state: 'Invalid OAuth state.',
        missing_params: 'Missing OAuth parameters.',
        timeout: 'Gmail connection timed out. Please try again.',
        unknown: 'Something went wrong. Please try again.',
        pro_limit: 'Pro plan allows up to 3 Gmail accounts. You already have 3 connected.',
        no_email: 'Google did not return an email for this account.',
      };
      setGmailError(messages[error] || `Gmail error: ${error}`);
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
    <div className="min-h-screen bg-sky-50 dark:bg-black/70 relative">
        <Header />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-zinc-200 dark:border-neutral-800 p-6 mb-6">
            <h1 className="text-2xl font-display font-bold text-zinc-900 dark:text-white mb-6 flex items-center gap-2">
              <Settings className="w-6 h-6" />
              Preferences
            </h1>

            {/* Mail account connection: SMTP or Gmail for both send + draft */}
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">Mail account connection</h2>
              <p className="text-sm text-zinc-600 dark:text-neutral-400 mb-3">
                Choose how to send and create drafts: <strong>SMTP</strong> (e.g. Gmail App Password) or <strong>Gmail (OAuth)</strong>. This applies to both sending emails and creating drafts from the queue.
              </p>
              {!mailConnectionLoading && (
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="mail_connection"
                      checked={mailConnectionType === 'smtp'}
                      onChange={() => setMailConnection('smtp')}
                      disabled={mailConnectionSaving}
                      className="text-sky-600 focus:ring-sky-500"
                    />
                    <span className="text-sm font-medium text-zinc-800 dark:text-neutral-200">SMTP</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="mail_connection"
                      checked={mailConnectionType === 'gmail'}
                      onChange={() => setMailConnection('gmail')}
                      disabled={mailConnectionSaving}
                      className="text-sky-600 focus:ring-sky-500"
                    />
                    <span className="text-sm font-medium text-zinc-800 dark:text-neutral-200">Gmail (OAuth)</span>
                  </label>
                  {mailConnectionSaving && (
                    <span className="text-sm text-zinc-500 dark:text-neutral-400">Saving…</span>
                  )}
                </div>
              )}
              {mailConnectionLoading && (
                <p className="text-sm text-zinc-500 dark:text-neutral-400">Loading…</p>
              )}
            </div>

            {/* Option 1: Gmail (OAuth) */}
            <div className="mb-6">
              <h3 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-3">Gmail (OAuth)</h3>
              {gmailError && (
                <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-xl p-4 flex items-start justify-between gap-4">
                  <p className="text-sm text-red-700 dark:text-red-200">{gmailError}</p>
                  <button
                    onClick={() => setGmailError(null)}
                    className="text-red-600 dark:text-red-400 hover:text-red-500 text-sm shrink-0"
                  >
                    Dismiss
                  </button>
                </div>
              )}
              {!gmailLoading && (
                <>
                  {!gmailConnected ? (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <MailX className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        <div>
                          <p className="font-semibold text-amber-800 dark:text-amber-200">Gmail not connected</p>
                          <p className="text-sm text-amber-700/90 dark:text-amber-200/80">
                            Connect your Gmail to receive generated email drafts in your inbox.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleConnectGmail}
                        className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl font-semibold transition-colors"
                      >
                        <MailCheck className="w-4 h-4" />
                        Connect Gmail
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-700/50 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <MailCheck className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                          <div>
                            <p className="font-semibold text-sky-800 dark:text-sky-200">Gmail connected</p>
                            <p className="text-sm text-sky-700/90 dark:text-sky-200/80">
                              {gmailAccounts.filter((a) => a.connected).length > 0
                                ? gmailAccounts.filter((a) => a.connected).map((a) => a.email).join(', ')
                                : gmailEmail || '—'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={handleDisconnectGmail}
                          disabled={gmailDisconnecting}
                          className="text-red-600 dark:text-red-400 hover:text-red-500 text-sm underline disabled:opacity-50"
                        >
                          {gmailDisconnecting ? 'Disconnecting...' : 'Disconnect primary'}
                        </button>
                      </div>
                      {plan === 'pro' && canAddMoreGmail && (
                        <div className="flex justify-end">
                          <a
                            href="/api/auth/gmail?add_secondary=1&return_to=/preferences"
                            className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-colors"
                          >
                            <MailCheck className="w-4 h-4" />
                            Connect another Gmail (Pro: up to 3)
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
              {gmailLoading && (
                <p className="text-zinc-500 dark:text-neutral-400 text-sm">Loading...</p>
              )}
            </div>

            {/* Option 2: SMTP – queue-based sending */}
            <div className="mb-6 pt-6 border-t border-zinc-200 dark:border-neutral-800">
              <h3 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-3 flex items-center gap-2">
                <Send className="w-5 h-5 text-sky-500" />
                SMTP
              </h3>
              <p className="text-sm text-zinc-600 dark:text-neutral-400 mb-4">
                Add a sending account to use the email queue: campaigns can enqueue leads and n8n sends via SMTP (e.g. Gmail App Password). The email address here should match the one you use for campaigns.
              </p>
              {senderAccountsLoading ? (
                <p className="text-zinc-500 dark:text-neutral-400 text-sm">Loading...</p>
              ) : (
                <SenderAccountForm accounts={senderAccounts} onSuccess={fetchSenderAccounts} />
              )}
            </div>
          </div>

          {/* Campaign Presets */}
          <section className="mt-8 pt-6 border-t border-zinc-200 dark:border-neutral-800">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-zinc-500 dark:text-neutral-400" />
              Campaign Presets
            </h2>
            <p className="text-sm text-zinc-600 dark:text-neutral-400 mb-4">
              Manage your saved campaign presets. Presets can be loaded in the campaign form to quickly fill in your configuration.
            </p>
            {presetsLoading ? (
              <p className="text-sm text-zinc-500 dark:text-neutral-400">Loading...</p>
            ) : presets.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-neutral-400">No presets yet. Save a preset from the campaign form.</p>
            ) : (
              <ul className="space-y-2">
                {presets.map((preset) => (
                  <li key={preset.id} className="flex items-center justify-between gap-3 bg-zinc-50 dark:bg-neutral-800/60 border border-zinc-200 dark:border-neutral-700 rounded-xl px-4 py-3">
                    <div className="flex-1 min-w-0">
                      {renamingPresetId === preset.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            className="flex-1 px-2 py-1 text-sm border border-zinc-300 dark:border-sky-700/40 rounded-lg bg-white dark:bg-neutral-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') { e.preventDefault(); renamePreset(preset.id, renameValue); }
                              if (e.key === 'Escape') { setRenamingPresetId(null); setRenameValue(''); }
                            }}
                            autoFocus
                          />
                          <button
                            onClick={() => renamePreset(preset.id, renameValue)}
                            className="px-2 py-1 text-xs bg-sky-500 hover:bg-sky-400 text-white rounded-lg transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => { setRenamingPresetId(null); setRenameValue(''); }}
                            className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm font-medium text-zinc-900 dark:text-white">{preset.name}</p>
                          {preset.businessType && (
                            <p className="text-xs text-zinc-500 dark:text-neutral-400">{preset.businessType}</p>
                          )}
                          <p className="text-xs text-zinc-400 dark:text-neutral-500">
                            {new Date(preset.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      )}
                    </div>
                    {renamingPresetId !== preset.id && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => { setRenamingPresetId(preset.id); setRenameValue(preset.name); }}
                          className="p-1.5 text-zinc-500 dark:text-neutral-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                          title="Rename"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deletePreset(preset.id)}
                          className="p-1.5 text-zinc-500 dark:text-neutral-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* LEGAL & COMPLIANCE */}
          <section className="mt-12 pt-8 border-t border-zinc-200 dark:border-neutral-800">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <Scale className="w-5 h-5 text-zinc-500 dark:text-neutral-400" />
              LEGAL & COMPLIANCE ⚖️
            </h2>
            <footer className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                <Link href="/legal/terms" className="text-sky-600 dark:text-sky-400 hover:underline">
                  Terms of Service
                </Link>
                <Link href="/legal/privacy" className="text-sky-600 dark:text-sky-400 hover:underline">
                  Privacy Policy
                </Link>
                <Link href="/legal/gdpr" className="text-sky-600 dark:text-sky-400 hover:underline">
                  GDPR compliance notice
                </Link>
              </div>
              <p className="flex items-center gap-2 text-zinc-600 dark:text-neutral-500">
                <Lock className="w-4 h-4 shrink-0" />
                Your data is encrypted and secure 🔒
              </p>
            </footer>
          </section>
        </div>
    </div>
  );
}
