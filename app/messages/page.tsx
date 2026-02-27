'use client';

import { useEffect, useState, useCallback } from 'react';
import Header from '@/components/Header';
import Link from 'next/link';
import { Mail, MessageCircle, ChevronRight, Clock, Pencil, Check, X } from 'lucide-react';

interface Conversation {
  id: string;
  email: string | null;
  replied: boolean;
  replied_at: string | null;
  gmail_thread_id: string;
  campaign_id: string | null;
  campaignName: string | null;
}

interface ThreadMessage {
  id: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  body: string;
  isFromUser: boolean;
}

interface PendingQueueItem {
  id: string;
  subject: string;
  body: string;
  scheduled_at: string;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff < 7) return `${diff}j`;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** Date + heure pour l’envoi programmé (ex. "26 févr. 2026 à 14:30") */
function formatScheduledAt(iso: string | undefined | null): string {
  if (iso == null || typeof iso !== 'string') return '';
  const trimmed = String(iso).trim();
  if (!trimmed) return '';
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return trimmed;
  const dateStr = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${dateStr} à ${timeStr}`;
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [thread, setThread] = useState<{
    leadId: string;
    email: string | null;
    messages: ThreadMessage[];
    pendingQueueItems: PendingQueueItem[];
  } | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [editingQueueId, setEditingQueueId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [savingQueueId, setSavingQueueId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/messages/conversations', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { conversations: [] }))
      .then((d) => {
        const list = d.conversations || [];
        setConversations(list);
        // Ouvrir la conversation du dernier prospect (premier de la liste, la plus récente)
        if (list.length > 0) {
          setSelectedLeadId(list[0].id);
        }
      })
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
  }, []);

  const fetchThread = useCallback(() => {
    if (!selectedLeadId) return;
    setThreadLoading(true);
    fetch(`/api/messages/thread?leadId=${encodeURIComponent(selectedLeadId)}`, {
      credentials: 'include',
    })
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load thread');
        return r.json();
      })
      .then((d) => {
        setThread({
          leadId: d.leadId,
          email: d.email,
          messages: d.messages || [],
          pendingQueueItems: d.pendingQueueItems || [],
        });
        setEditingQueueId(null);
      })
      .catch(() => setThread(null))
      .finally(() => setThreadLoading(false));
  }, [selectedLeadId]);

  useEffect(() => {
    if (!selectedLeadId) {
      setThread(null);
      return;
    }
    fetchThread();
  }, [selectedLeadId, fetchThread]);

  async function saveQueueItemEdit(queueId: string) {
    setSavingQueueId(queueId);
    try {
      const res = await fetch('/api/messages/queue-item', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ queueId, subject: editSubject, body: editBody }),
      });
      if (res.ok) {
        setEditingQueueId(null);
        fetchThread();
      }
    } finally {
      setSavingQueueId(null);
    }
  }

  const selectedConv = conversations.find((c) => c.id === selectedLeadId);

  return (
    <div className="min-h-screen bg-white/60 dark:bg-black/70 relative">
      <div className="relative z-10">
        <Header backHref="/dashboard" />
        <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-4 lg:px-6 pt-0 pb-0">
          <div className="flex flex-col sm:flex-row gap-0 sm:gap-4 rounded-none sm:rounded-xl border-0 sm:border border-zinc-200 dark:border-neutral-800 border-t border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden min-h-[calc(100vh-4rem)]">
            {/* Liste des conversations */}
            <aside className="w-full sm:w-72 flex-shrink-0 border-b sm:border-b-0 sm:border-r border-zinc-200 dark:border-neutral-800">
              <div className="p-4 border-b border-zinc-100 dark:border-neutral-800">
                <h1 className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-sky-500" />
                  Messagerie
                </h1>
                <p className="text-sm text-zinc-500 dark:text-neutral-400 mt-0.5">
                  Conversations avec vos prospects
                </p>
              </div>
              <div className="overflow-y-auto max-h-[50vh] sm:max-h-[calc(100vh-8rem)]">
                {loading ? (
                  <div className="p-6 text-center text-sm text-zinc-500 dark:text-neutral-400">
                    Chargement…
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="p-6 text-center text-sm text-zinc-500 dark:text-neutral-400">
                    <Mail className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p>Aucune conversation pour l’instant.</p>
                    <p className="mt-2">
                      Envoyez des brouillons Gmail depuis vos campagnes pour voir les échanges ici.
                    </p>
                    <Link
                      href="/preferences"
                      className="inline-block mt-4 text-sky-600 dark:text-sky-400 hover:underline text-sm"
                    >
                      Connecter Gmail
                    </Link>
                  </div>
                ) : (
                  <ul className="divide-y divide-zinc-100 dark:divide-neutral-800">
                    {conversations.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedLeadId(c.id)}
                          className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                            selectedLeadId === c.id
                              ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-900 dark:text-sky-100'
                              : 'hover:bg-zinc-50 dark:hover:bg-neutral-800/50 text-zinc-800 dark:text-neutral-200'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {c.email || 'Sans email'}
                            </p>
                            {c.campaignName && (
                              <p className="text-xs text-zinc-500 dark:text-neutral-400 truncate">
                                {c.campaignName}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {c.replied && (
                              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                Répondu
                              </span>
                            )}
                            <span className="text-xs text-zinc-400 dark:text-neutral-500">
                              {c.replied_at ? formatDate(c.replied_at) : '—'}
                            </span>
                            <ChevronRight className="w-5 h-5 text-zinc-600 dark:text-neutral-300 shrink-0" strokeWidth={2} aria-hidden />
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </aside>

            {/* Thread / détail */}
            <main className="flex-1 flex flex-col min-w-0">
              {!selectedLeadId ? (
                <div className="flex-1 flex items-center justify-center p-8 text-center text-zinc-500 dark:text-neutral-400">
                  <Mail className="w-12 h-12 mx-auto mb-4 opacity-40" />
                  <p>Sélectionnez une conversation pour afficher les messages.</p>
                </div>
              ) : threadLoading ? (
                <div className="flex-1 flex items-center justify-center p-8">
                  <p className="text-sm text-zinc-500 dark:text-neutral-400">Chargement…</p>
                </div>
              ) : thread ? (
                <>
                  <div className="px-4 py-2.5 border-b border-zinc-200 dark:border-neutral-800 bg-zinc-50/50 dark:bg-neutral-800/30 shrink-0">
                    <h2 className="font-semibold text-zinc-900 dark:text-white text-sm sm:text-base">
                      {thread.email || selectedConv?.email || 'Prospect'}
                    </h2>
                    {selectedConv?.campaignName && (
                      <p className="text-xs text-zinc-500 dark:text-neutral-400 mt-0.5">
                        {selectedConv.campaignName}
                      </p>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0">
                    {thread.messages.length === 0 && (!thread.pendingQueueItems?.length) ? (
                      <p className="text-sm text-zinc-500 dark:text-neutral-400">
                        Aucun message dans ce fil.
                      </p>
                    ) : (
                      <>
                        {thread.messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.isFromUser ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                                msg.isFromUser
                                  ? 'bg-sky-600 text-white dark:bg-sky-500'
                                  : 'bg-zinc-100 dark:bg-neutral-700 text-zinc-900 dark:text-neutral-100'
                              }`}
                            >
                              <p className="text-xs opacity-80 mb-1">
                                {msg.isFromUser ? 'Vous' : (msg.from || 'Prospect')} · {formatDate(msg.date)}
                              </p>
                              <div className="text-sm whitespace-pre-wrap break-words">
                                {msg.body || msg.snippet}
                              </div>
                            </div>
                          </div>
                        ))}
                        {/* Envois programmés — éditables avant l'envoi */}
                        {(thread.pendingQueueItems?.length ?? 0) > 0 && (
                          <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-neutral-700">
                            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-neutral-400 mb-3 flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              Envois programmés
                            </p>
                            <div className="space-y-4">
                              {thread.pendingQueueItems.map((item) => (
                                <div
                                  key={item.id}
                                  className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/30 p-4"
                                >
                                  {editingQueueId === item.id ? (
                                    <div className="space-y-3">
                                      <input
                                        type="text"
                                        value={editSubject}
                                        onChange={(e) => setEditSubject(e.target.value)}
                                        placeholder="Sujet"
                                        className="w-full rounded-lg border border-zinc-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-zinc-900 dark:text-white"
                                      />
                                      <textarea
                                        value={editBody}
                                        onChange={(e) => setEditBody(e.target.value)}
                                        placeholder="Message"
                                        rows={5}
                                        className="w-full rounded-lg border border-zinc-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-zinc-900 dark:text-white resize-y"
                                      />
                                      <div className="flex gap-2">
                                        <button
                                          type="button"
                                          onClick={() => saveQueueItemEdit(item.id)}
                                          disabled={savingQueueId === item.id}
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-500 disabled:opacity-50"
                                        >
                                          <Check className="w-4 h-4" />
                                          {savingQueueId === item.id ? 'Enregistrement…' : 'Enregistrer'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => { setEditingQueueId(null); setEditSubject(item.subject); setEditBody(item.body); }}
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-200 dark:bg-neutral-600 text-zinc-800 dark:text-neutral-200 text-sm font-medium hover:bg-zinc-300 dark:hover:bg-neutral-500"
                                        >
                                          <X className="w-4 h-4" />
                                          Annuler
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-2 flex items-center gap-2">
                                        <Clock className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                                        <span>Heure de programmation :</span>
                                        <span className="text-amber-800 dark:text-amber-200">
                                          {formatScheduledAt(item.scheduled_at) || item.scheduled_at || '—'}
                                        </span>
                                      </p>
                                      <p className="font-medium text-zinc-900 dark:text-white text-sm mb-1">{item.subject || '(Sans objet)'}</p>
                                      <p className="text-sm text-zinc-600 dark:text-neutral-300 whitespace-pre-wrap line-clamp-3">{item.body || '—'}</p>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingQueueId(item.id);
                                          setEditSubject(item.subject);
                                          setEditBody(item.body);
                                        }}
                                        className="mt-2 inline-flex items-center gap-1.5 text-sm text-sky-600 dark:text-sky-400 hover:underline"
                                      >
                                        <Pencil className="w-4 h-4" />
                                        Modifier
                                      </button>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center p-8 text-center text-zinc-500 dark:text-neutral-400">
                  <p>Impossible de charger la conversation.</p>
                  <p className="text-sm mt-2">Vérifiez que Gmail est connecté dans les préférences.</p>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
