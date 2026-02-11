'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Link from 'next/link';
import { ArrowLeft, Mail, Plus, Trash2 } from 'lucide-react';

interface EmailTemplate {
  id: string;
  name?: string;
  content: string;
  createdAt: string;
}

export default function ExempleMailsPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newContent, setNewContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function fetchTemplates() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/email-templates', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setTemplates(Array.isArray(data) ? data : []);
      } else {
        setTemplates([]);
        if (res.status === 401) setError('Connectez-vous pour voir vos modèles.');
      }
    } catch {
      setTemplates([]);
      setError('Impossible de charger les modèles.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newContent.trim();
    if (!trimmed) {
      setError('Le contenu est requis.');
      return;
    }
    setAdding(true);
    setError(null);
    try {
      const res = await fetch('/api/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed, name: newName.trim() || undefined }),
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.templates) {
        setTemplates(data.templates);
        setNewContent('');
        setNewName('');
      } else {
        setError(data.error || 'Erreur lors de l’ajout.');
      }
    } catch {
      setError('Erreur lors de l’enregistrement.');
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/email-templates/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setTemplates((prev) => prev.filter((t) => t.id !== id));
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <Header />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-zinc-500 dark:text-neutral-400 hover:text-zinc-900 dark:hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour au tableau de bord
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-display font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Mail className="w-6 h-6" />
            Exemple mails
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-neutral-400">
            Modèles d’emails enregistrés pour personnaliser vos campagnes.
          </p>
        </div>

        <form onSubmit={handleAdd} className="mb-8">
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-700 dark:text-neutral-300 mb-2">
              Nom (optionnel)
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex: Relance prospection"
              className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              disabled={adding}
            />
          </div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-neutral-300 mb-2">
            Contenu du modèle
          </label>
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Corps de l’email type que vous souhaitez réutiliser..."
            className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-y min-h-[140px]"
            rows={5}
            disabled={adding}
          />
          <div className="mt-2 flex justify-end">
            <button
              type="submit"
              disabled={adding || !newContent.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              {adding ? 'Ajout…' : 'Enregistrer'}
            </button>
          </div>
        </form>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-zinc-500 dark:text-neutral-400">Chargement…</p>
        ) : templates.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 border-dashed p-8 text-center text-zinc-500 dark:text-neutral-400">
            Aucun modèle enregistré. Ajoutez-en un ci-dessus pour le réutiliser dans vos campagnes.
          </div>
        ) : (
          <ul className="space-y-4">
            {templates.map((t) => (
              <li
                key={t.id}
                className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-zinc-50 dark:bg-neutral-900/50 p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  {t.name && (
                    <p className="text-sm font-medium text-zinc-900 dark:text-white mb-1">{t.name}</p>
                  )}
                  <p className="text-sm text-zinc-700 dark:text-neutral-300 whitespace-pre-wrap break-words line-clamp-4">
                    {t.content}
                  </p>
                  <p className="text-xs text-zinc-400 dark:text-neutral-500 mt-2">
                    {new Date(t.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(t.id)}
                  disabled={deletingId === t.id}
                  className="shrink-0 p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
