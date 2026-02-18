'use client';

import { useState } from 'react';
import { Mail, Plus, ExternalLink, Loader2 } from 'lucide-react';

const GMAIL_APP_PASSWORDS_URL = 'https://support.google.com/accounts/answer/185833';

const PROVIDERS = [
  {
    id: 'gmail',
    label: 'Gmail',
    smtpHost: 'smtp.gmail.com',
    smtpPort: 465,
    imapHost: 'imap.gmail.com',
    imapPort: 993,
  },
  {
    id: 'custom',
    label: 'Custom (SMTP)',
    smtpHost: '',
    smtpPort: 465,
    imapHost: '',
    imapPort: 993,
  },
] as const;

interface SenderAccountPublic {
  id: string;
  email: string;
  smtpHost: string;
  smtpPort: number;
  isPrimary: boolean;
  createdAt: string;
}

interface SenderAccountFormProps {
  accounts: SenderAccountPublic[];
  onSuccess: () => void;
}

export default function SenderAccountForm({ accounts, onSuccess }: SenderAccountFormProps) {
  const [provider, setProvider] = useState<'gmail' | 'custom'>('gmail');
  const [email, setEmail] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [smtpHost, setSmtpHost] = useState(PROVIDERS[0].smtpHost);
  const [smtpPort, setSmtpPort] = useState(PROVIDERS[0].smtpPort);
  const [imapHost, setImapHost] = useState(PROVIDERS[0].imapHost);
  const [imapPort, setImapPort] = useState(PROVIDERS[0].imapPort);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProviderChange = (id: 'gmail' | 'custom') => {
    setProvider(id);
    const p = PROVIDERS.find((x) => x.id === id);
    if (p) {
      setSmtpHost(p.smtpHost);
      setSmtpPort(p.smtpPort);
      setImapHost(p.imapHost);
      setImapPort(p.imapPort);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError('Email is required.');
      return;
    }
    if (!appPassword.trim()) {
      setError('App password is required.');
      return;
    }
    if (provider === 'custom' && !smtpHost.trim()) {
      setError('SMTP host is required for custom provider.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/sender-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          smtpHost: smtpHost.trim(),
          smtpPort: Number(smtpPort),
          smtpUser: email.trim(),
          smtpPassword: appPassword,
          imapHost: imapHost?.trim() || undefined,
          imapPort: imapPort ?? undefined,
          isPrimary: accounts.length === 0,
        }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || data.details || 'Failed to save.');
        return;
      }
      setEmail('');
      setAppPassword('');
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Network error.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {accounts.length > 0 && (
        <div className="rounded-xl border border-zinc-200 dark:border-neutral-700 bg-white dark:bg-neutral-900/50 p-4">
          <p className="text-sm font-medium text-zinc-700 dark:text-neutral-300 mb-2">Configured sending accounts</p>
          <ul className="text-sm text-zinc-600 dark:text-neutral-400 space-y-1">
            {accounts.map((a) => (
              <li key={a.id} className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-sky-500" />
                {a.email} — {a.smtpHost}:{a.smtpPort}
                {a.isPrimary && <span className="text-xs text-sky-600 dark:text-sky-400">(primary)</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-neutral-300 mb-1">Provider</label>
          <select
            value={provider}
            onChange={(e) => handleProviderChange(e.target.value as 'gmail' | 'custom')}
            className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-zinc-900 dark:text-white"
          >
            {PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {provider === 'gmail' && (
          <p className="text-xs text-zinc-500 dark:text-neutral-400">
            Pre-filled: smtp.gmail.com:465. Use a{' '}
            <a
              href={GMAIL_APP_PASSWORDS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-0.5"
            >
              Google App Password
              <ExternalLink className="w-3 h-3" />
            </a>{' '}
            (not your normal Gmail password).
          </p>
        )}

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-neutral-300 mb-1">Email address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@gmail.com"
            className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-zinc-900 dark:text-white placeholder-zinc-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-neutral-300 mb-1">
            App password / SMTP password
          </label>
          <input
            type="password"
            value={appPassword}
            onChange={(e) => setAppPassword(e.target.value)}
            placeholder="••••••••••••••••"
            autoComplete="off"
            className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-zinc-900 dark:text-white placeholder-zinc-400"
          />
        </div>

        {provider === 'custom' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-neutral-300 mb-1">SMTP host</label>
                <input
                  type="text"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  placeholder="smtp.example.com"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-zinc-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-neutral-300 mb-1">SMTP port</label>
                <input
                  type="number"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-zinc-900 dark:text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-neutral-300 mb-1">IMAP host (optional)</label>
                <input
                  type="text"
                  value={imapHost}
                  onChange={(e) => setImapHost(e.target.value)}
                  placeholder="imap.example.com"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-zinc-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-neutral-300 mb-1">IMAP port</label>
                <input
                  type="number"
                  value={imapPort}
                  onChange={(e) => setImapPort(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-zinc-900 dark:text-white"
                />
              </div>
            </div>
          </>
        )}

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl font-medium transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Add sending account'}
        </button>
      </form>
    </div>
  );
}
