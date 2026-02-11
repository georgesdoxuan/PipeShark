'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Link from 'next/link';
import { ArrowLeft, FileText, Plus, Trash2, Pencil, Check, X } from 'lucide-react';

interface CompanyDescription {
  id: string;
  content: string;
  campaignName?: string;
  createdAt: string;
}

export default function BusinessDescriptionsPage() {
  const [descriptions, setDescriptions] = useState<CompanyDescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editCampaignName, setEditCampaignName] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  async function fetchDescriptions() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/company-descriptions', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setDescriptions(Array.isArray(data) ? data : []);
      } else {
        setDescriptions([]);
        if (res.status === 401) setError('Connectez-vous pour voir vos descriptions.');
      }
    } catch {
      setDescriptions([]);
      setError('Impossible de charger les descriptions.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDescriptions();
  }, []);

  function normalizeContent(content: string): string {
    return content.trim().replace(/\s+/g, ' ');
  }

  const uniqueDescriptions = (() => {
    const seen = new Set<string>();
    return descriptions.filter((d) => {
      const key = normalizeContent(d.content);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })();

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newContent.trim();
    if (trimmed.length < 50) {
      setError('La description doit contenir au moins 50 caractères.');
      return;
    }
    const normalized = normalizeContent(trimmed);
    if (descriptions.some((d) => normalizeContent(d.content) === normalized)) {
      setError('Cette description existe déjà.');
      return;
    }
    setAdding(true);
    setError(null);
    try {
      const res = await fetch('/api/company-descriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.descriptions) {
        setDescriptions(data.descriptions);
        setNewContent('');
      } else {
        setError(data.error || 'Erreur lors de l’ajout.');
        if (data.descriptions) setDescriptions(data.descriptions);
      }
    } catch {
      setError('Erreur lors de l’enregistrement.');
    } finally {
      setAdding(false);
    }
  }

  function startEdit(d: CompanyDescription) {
    setEditingId(d.id);
    setEditContent(d.content);
    setEditCampaignName(d.campaignName || '');
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditContent('');
    setEditCampaignName('');
  }

  async function handleSaveEdit(id: string) {
    const trimmed = editContent.trim();
    if (trimmed.length < 50) {
      setError('La description doit contenir au moins 50 caractères.');
      return;
    }
    setSavingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/company-descriptions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed, campaignName: editCampaignName.trim() || undefined }),
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.id) {
        setDescriptions((prev) =>
          prev.map((d) => (d.id === id ? { ...d, content: data.content, campaignName: data.campaignName } : d))
        );
        cancelEdit();
      } else {
        setError(data.error || 'Erreur lors de l’enregistrement.');
      }
    } catch {
      setError('Erreur lors de l’enregistrement.');
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/company-descriptions/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setDescriptions((prev) => prev.filter((d) => d.id !== id));
        if (editingId === id) cancelEdit();
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
            <FileText className="w-6 h-6" />
            Business descriptions
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-neutral-400">
            Descriptions d’entreprise enregistrées, réutilisables pour vos campagnes.
          </p>
        </div>

        <form onSubmit={handleAdd} className="mb-8">
          <label className="block text-sm font-medium text-zinc-700 dark:text-neutral-300 mb-2">
            Nouvelle description (min. 50 caractères)
          </label>
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Ex: We are a family-owned plumbing company with 15 years of experience..."
            className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-y min-h-[120px]"
            rows={4}
            disabled={adding}
          />
          <div className="mt-2 flex items-center justify-between gap-4">
            <span className="text-xs text-zinc-500 dark:text-neutral-500">
              {newContent.trim().length} / 50 caractères
            </span>
            <button
              type="submit"
              disabled={adding || newContent.trim().length < 50}
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
        ) : uniqueDescriptions.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 border-dashed p-8 text-center text-zinc-500 dark:text-neutral-400">
            Aucune description enregistrée. Ajoutez-en une ci-dessus.
          </div>
        ) : (
          <ul className="space-y-4">
            {uniqueDescriptions.map((d) => (
              <li
                key={d.id}
                className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-zinc-50 dark:bg-neutral-900/50 p-4 flex flex-col gap-3"
              >
                {editingId === d.id ? (
                  <>
                    <input
                      type="text"
                      value={editCampaignName}
                      onChange={(e) => setEditCampaignName(e.target.value)}
                      placeholder="Nom (optionnel, ex: V3)"
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-sky-500 text-sm"
                    />
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-sky-500 resize-y min-h-[100px] text-sm"
                      rows={4}
                      disabled={savingId === d.id}
                    />
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-zinc-500 dark:text-neutral-500">
                        {editContent.trim().length} / 50 caractères
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={savingId === d.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-zinc-600 dark:text-neutral-400 hover:bg-zinc-200 dark:hover:bg-neutral-700 rounded-lg text-sm font-medium transition-colors"
                        >
                          <X className="w-4 h-4" />
                          Annuler
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(d.id)}
                          disabled={savingId === d.id || editContent.trim().length < 50}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          <Check className="w-4 h-4" />
                          {savingId === d.id ? 'Enregistrement…' : 'Enregistrer'}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {d.campaignName && (
                          <p className="text-xs font-medium text-sky-600 dark:text-sky-400 mb-1">{d.campaignName}</p>
                        )}
                        <p className="text-sm text-zinc-700 dark:text-neutral-300 whitespace-pre-wrap break-words">
                          {d.content}
                        </p>
                        <p className="text-xs text-zinc-400 dark:text-neutral-500 mt-2">
                          {new Date(d.createdAt).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => startEdit(d)}
                          className="p-2 text-zinc-600 dark:text-neutral-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-zinc-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(d.id)}
                          disabled={deletingId === d.id}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
