'use client';

import { useEffect, useState, useRef } from 'react';
import Header from '@/components/Header';
import Link from 'next/link';
import { ArrowLeft, FileText, Mail, Plus, Trash2, Pencil, SlidersHorizontal } from 'lucide-react';

interface CompanyDescription {
  id: string;
  content: string;
  campaignName?: string;
  createdAt: string;
}

interface EmailTemplate {
  id: string;
  name?: string;
  content: string;
  createdAt: string;
}

export default function ConfigurationPage() {
  const businessRef = useRef<HTMLDivElement>(null);
  const emailsRef = useRef<HTMLDivElement>(null);

  // Business descriptions
  const [descriptions, setDescriptions] = useState<CompanyDescription[]>([]);
  const [loadingDesc, setLoadingDesc] = useState(true);
  const [addingDesc, setAddingDesc] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [errorDesc, setErrorDesc] = useState<string | null>(null);
  const [deletingDescId, setDeletingDescId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editCampaignName, setEditCampaignName] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  // Email templates
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loadingTpl, setLoadingTpl] = useState(true);
  const [addingTpl, setAddingTpl] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTplContent, setNewTplContent] = useState('');
  const [errorTpl, setErrorTpl] = useState<string | null>(null);
  const [deletingTplId, setDeletingTplId] = useState<string | null>(null);

  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash.slice(1) : '';
    if (hash === 'exemple-mails' && emailsRef.current) emailsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (hash === 'business-descriptions' && businessRef.current) businessRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  async function fetchDescriptions() {
    setLoadingDesc(true);
    setErrorDesc(null);
    try {
      const res = await fetch('/api/company-descriptions', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setDescriptions(Array.isArray(data) ? data : []);
      } else {
        setDescriptions([]);
        if (res.status === 401) setErrorDesc('Log in to see your descriptions.');
      }
    } catch {
      setDescriptions([]);
      setErrorDesc('Could not load descriptions.');
    } finally {
      setLoadingDesc(false);
    }
  }

  async function fetchTemplates() {
    setLoadingTpl(true);
    setErrorTpl(null);
    try {
      const res = await fetch('/api/email-templates', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setTemplates(Array.isArray(data) ? data : []);
      } else {
        setTemplates([]);
        if (res.status === 401) setErrorTpl('Log in to see your templates.');
      }
    } catch {
      setTemplates([]);
      setErrorTpl('Could not load templates.');
    } finally {
      setLoadingTpl(false);
    }
  }

  useEffect(() => {
    fetchDescriptions();
    fetchTemplates();
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

  async function handleAddDesc(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newContent.trim();
    if (trimmed.length < 50) {
      setErrorDesc('Min. 50 characters.');
      return;
    }
    const normalized = normalizeContent(trimmed);
    if (descriptions.some((d) => normalizeContent(d.content) === normalized)) {
      setErrorDesc('This description already exists.');
      return;
    }
    setAddingDesc(true);
    setErrorDesc(null);
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
        setErrorDesc(data.error || 'Error adding.');
        if (data.descriptions) setDescriptions(data.descriptions);
      }
    } catch {
      setErrorDesc('Error saving.');
    } finally {
      setAddingDesc(false);
    }
  }

  function startEdit(d: CompanyDescription) {
    setEditingId(d.id);
    setEditContent(d.content);
    setEditCampaignName(d.campaignName || '');
    setErrorDesc(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditContent('');
    setEditCampaignName('');
  }

  async function handleSaveEdit(id: string) {
    const trimmed = editContent.trim();
    if (trimmed.length < 50) {
      setErrorDesc('Min. 50 characters.');
      return;
    }
    setSavingId(id);
    setErrorDesc(null);
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
        setErrorDesc(data.error || 'Error saving.');
      }
    } catch {
      setErrorDesc('Error saving.');
    } finally {
      setSavingId(null);
    }
  }

  async function handleDeleteDesc(id: string) {
    setDeletingDescId(id);
    try {
      const res = await fetch(`/api/company-descriptions/${id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        setDescriptions((prev) => prev.filter((d) => d.id !== id));
        if (editingId === id) cancelEdit();
      }
    } finally {
      setDeletingDescId(null);
    }
  }

  async function handleAddTpl(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newTplContent.trim();
    if (!trimmed) {
      setErrorTpl('Content is required.');
      return;
    }
    setAddingTpl(true);
    setErrorTpl(null);
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
        setNewTplContent('');
        setNewName('');
      } else {
        setErrorTpl(data.error || 'Error adding template.');
      }
    } catch {
      setErrorTpl('Error saving.');
    } finally {
      setAddingTpl(false);
    }
  }

  async function handleDeleteTpl(id: string) {
    setDeletingTplId(id);
    try {
      const res = await fetch(`/api/email-templates/${id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) setTemplates((prev) => prev.filter((t) => t.id !== id));
    } finally {
      setDeletingTplId(null);
    }
  }

  return (
    <div className="min-h-screen bg-sky-50 dark:bg-neutral-950">
      <Header />
      <div className="px-4 sm:px-6 lg:px-8 py-4 max-w-6xl mx-auto">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 dark:text-neutral-400 hover:text-zinc-900 dark:hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </Link>
        <h1 className="text-xl font-display font-bold text-zinc-900 dark:text-white flex items-center gap-2 mb-4">
          <SlidersHorizontal className="w-5 h-5 text-sky-500" />
          Configuration
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-10rem)] min-h-[420px]">
          {/* Business descriptions */}
          <section
            ref={businessRef}
            id="business-descriptions"
            className="flex flex-col min-h-0 rounded-xl border border-sky-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden"
          >
            <div className="shrink-0 px-4 py-3 border-b border-zinc-200 dark:border-neutral-700 flex items-center gap-2">
              <FileText className="w-5 h-5 text-sky-500" />
              <h2 className="font-semibold text-zinc-900 dark:text-white">Business descriptions</h2>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
              <form onSubmit={handleAddDesc} className="space-y-2">
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="e.g. We are a family-owned plumbing company..."
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-zinc-900 dark:text-white text-sm placeholder-zinc-400 focus:ring-2 focus:ring-sky-500 resize-none min-h-[80px]"
                  rows={3}
                  disabled={addingDesc}
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-zinc-500">{newContent.trim().length}/50</span>
                  <button
                    type="submit"
                    disabled={addingDesc || newContent.trim().length < 50}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {addingDesc ? '…' : 'Add'}
                  </button>
                </div>
              </form>
              {errorDesc && (
                <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                  {errorDesc}
                </p>
              )}
              {loadingDesc ? (
                <p className="text-xs text-zinc-500">Loading…</p>
              ) : uniqueDescriptions.length === 0 ? (
                <p className="text-xs text-zinc-500 py-2">No descriptions yet.</p>
              ) : (
                <ul className="space-y-2">
                  {uniqueDescriptions.map((d) => (
                    <li
                      key={d.id}
                      className="rounded-lg border border-zinc-200 dark:border-neutral-700 bg-zinc-50 dark:bg-neutral-800/50 p-3 text-sm"
                    >
                      {editingId === d.id ? (
                        <>
                          <input
                            type="text"
                            value={editCampaignName}
                            onChange={(e) => setEditCampaignName(e.target.value)}
                            placeholder="Name (optional)"
                            className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-neutral-600 text-sm mb-2"
                          />
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-neutral-600 text-sm resize-none min-h-[60px] mb-2"
                            rows={2}
                            disabled={savingId === d.id}
                          />
                          <div className="flex justify-end gap-1">
                            <button type="button" onClick={cancelEdit} className="px-2 py-1 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-neutral-700 rounded text-xs">
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(d.id)}
                              disabled={savingId === d.id || editContent.trim().length < 50}
                              className="px-2 py-1 bg-sky-600 text-white rounded text-xs disabled:opacity-50"
                            >
                              {savingId === d.id ? '…' : 'Save'}
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          {d.campaignName && <p className="text-xs text-sky-600 dark:text-sky-400 mb-0.5">{d.campaignName}</p>}
                          <p className="text-zinc-700 dark:text-neutral-300 line-clamp-3">{d.content}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-zinc-400">{new Date(d.createdAt).toLocaleDateString()}</span>
                            <div className="flex gap-0.5">
                              <button type="button" onClick={() => startEdit(d)} className="p-1 text-zinc-500 hover:text-sky-600 rounded" title="Edit">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button type="button" onClick={() => handleDeleteDesc(d.id)} disabled={deletingDescId === d.id} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50" title="Delete">
                                <Trash2 className="w-3.5 h-3.5" />
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
          </section>

          {/* Example emails */}
          <section
            ref={emailsRef}
            id="exemple-mails"
            className="flex flex-col min-h-0 rounded-xl border border-sky-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden"
          >
            <div className="shrink-0 px-4 py-3 border-b border-zinc-200 dark:border-neutral-700 flex items-center gap-2">
              <Mail className="w-5 h-5 text-sky-500" />
              <h2 className="font-semibold text-zinc-900 dark:text-white">Example emails</h2>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
              <form onSubmit={handleAddTpl} className="space-y-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Name (optional)"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-zinc-900 dark:text-white text-sm placeholder-zinc-400 focus:ring-2 focus:ring-sky-500"
                  disabled={addingTpl}
                />
                <textarea
                  value={newTplContent}
                  onChange={(e) => setNewTplContent(e.target.value)}
                  placeholder="Email template body..."
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-zinc-900 dark:text-white text-sm placeholder-zinc-400 focus:ring-2 focus:ring-sky-500 resize-none min-h-[80px]"
                  rows={3}
                  disabled={addingTpl}
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={addingTpl || !newTplContent.trim()}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {addingTpl ? '…' : 'Add'}
                  </button>
                </div>
              </form>
              {errorTpl && (
                <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                  {errorTpl}
                </p>
              )}
              {loadingTpl ? (
                <p className="text-xs text-zinc-500">Loading…</p>
              ) : templates.length === 0 ? (
                <p className="text-xs text-zinc-500 py-2">No templates yet.</p>
              ) : (
                <ul className="space-y-2">
                  {templates.map((t) => (
                    <li key={t.id} className="rounded-lg border border-zinc-200 dark:border-neutral-700 bg-zinc-50 dark:bg-neutral-800/50 p-3 flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {t.name && <p className="text-sm font-medium text-zinc-900 dark:text-white mb-0.5">{t.name}</p>}
                        <p className="text-sm text-zinc-700 dark:text-neutral-300 line-clamp-3">{t.content}</p>
                        <p className="text-xs text-zinc-400 mt-1">{new Date(t.createdAt).toLocaleDateString()}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteTpl(t.id)}
                        disabled={deletingTplId === t.id}
                        className="shrink-0 p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
