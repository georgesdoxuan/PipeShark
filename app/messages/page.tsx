'use client';

import { useEffect, useState, useCallback } from 'react';
import Header from '@/components/Header';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, ChevronRight, Clock, Pencil, Check, X, TrendingUp, TrendingDown, Minus } from 'lucide-react';

type Sentiment = 'positive' | 'neutral' | 'negative';

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

/** Date and time for scheduled send (e.g. l’envoi programmé (ex. "26 févr. 2026 à 14:30") */
function formatScheduledAt(iso: string | undefined | null): string {
  if (iso == null || typeof iso !== 'string') return '';
  const trimmed = String(iso).trim();
  if (!trimmed) return '';
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return trimmed;
  const dateStr = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${dateStr} at ${timeStr}`;
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
  const [threadErrorCode, setThreadErrorCode] = useState<string | null>(null);
  const [editingQueueId, setEditingQueueId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [savingQueueId, setSavingQueueId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'sent' | 'replies'>('all');
  const [sentimentCache, setSentimentCache] = useState<Record<string, Sentiment>>({});

  // Sync activeTab with URL hash (#sent, #replies)
  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash.slice(1).toLowerCase() : '';
    if (hash === 'replies') setActiveTab('replies');
    else if (hash === 'sent') setActiveTab('sent');
  }, []);

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
    setThreadErrorCode(null);
    fetch(`/api/messages/thread?leadId=${encodeURIComponent(selectedLeadId)}`, {
      credentials: 'include',
    })
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          setThreadErrorCode(body.code ?? 'ERROR');
          throw new Error('Failed to load thread');
        }
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

  // Analyze sentiment of incoming replies when thread changes
  useEffect(() => {
    if (!thread) return;
    const replies = thread.messages.filter(m => !m.isFromUser && m.body);
    if (replies.length === 0) return;
    // Analyze the most recent reply for the thread's lead
    const latest = replies[replies.length - 1];
    const cacheKey = latest.id;
    if (sentimentCache[cacheKey]) return;
    fetch('/api/messages/sentiment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: latest.body }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.sentiment) {
          setSentimentCache(prev => ({ ...prev, [cacheKey]: d.sentiment, [thread.leadId]: d.sentiment }));
        }
      })
      .catch(() => {});
  }, [thread]);

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
  const displayedConversations =
    activeTab === 'replies'
      ? conversations.filter((c) => c.replied)
      : activeTab === 'sent'
        ? conversations.filter((c) => !c.replied)
        : conversations;

  function SentimentBadge({ sentiment, size = 'sm' }: { sentiment: Sentiment; size?: 'sm' | 'xs' }) {
    const sz = size === 'xs' ? 'w-3 h-3' : 'w-3.5 h-3.5';
    if (sentiment === 'positive') return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-xs font-medium shrink-0">
        <TrendingUp className={sz} />
      </span>
    );
    if (sentiment === 'negative') return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-xs font-medium shrink-0">
        <TrendingDown className={sz} />
      </span>
    );
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-neutral-700 text-zinc-500 dark:text-zinc-400 text-xs font-medium shrink-0">
        <Minus className={sz} />
      </span>
    );
  }

  return (
    <div className="min-h-screen bg-white/60 dark:bg-black/70 relative">
      <div className="relative z-10">
        <Header />
        <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-4 lg:px-6 pt-0 pb-0">
          <div className="flex flex-col sm:flex-row gap-0 sm:gap-4 rounded-none sm:rounded-xl border-0 sm:border border-zinc-200 dark:border-neutral-800 border-t border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden min-h-[calc(100vh-4rem)]">
            {/* Liste des conversations */}
            <aside className="w-full sm:w-72 flex-shrink-0 border-b sm:border-b-0 sm:border-r border-zinc-200 dark:border-neutral-800">
              <div className="p-4 border-b border-zinc-100 dark:border-neutral-800">
                <h1 className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2 mb-3">
                  <Image src="/mail.png" alt="" width={20} height={20} className="w-5 h-5 object-contain [filter:brightness(0)] dark:[filter:brightness(0)_invert(1)]" />
                  Messages
                </h1>
                <div className="flex gap-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => { setActiveTab('all'); if (typeof window !== 'undefined') window.history.replaceState(null, '', '/messages'); }}
                    className={`flex-1 min-w-0 py-1.5 text-xs font-medium rounded-lg transition-colors ${activeTab === 'all' ? 'bg-zinc-100 dark:bg-neutral-700 text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-neutral-400 hover:bg-zinc-50 dark:hover:bg-neutral-800'}`}
                  >
                    All ({conversations.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('sent'); if (typeof window !== 'undefined') window.history.replaceState(null, '', '/messages#sent'); }}
                    className={`flex-1 min-w-0 py-1.5 text-xs font-medium rounded-lg transition-colors ${activeTab === 'sent' ? 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-400' : 'text-zinc-500 dark:text-neutral-400 hover:bg-zinc-50 dark:hover:bg-neutral-800'}`}
                  >
                    Emails Sent ({conversations.filter((c) => !c.replied).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('replies'); if (typeof window !== 'undefined') window.history.replaceState(null, '', '/messages#replies'); }}
                    className={`flex-1 min-w-0 py-1.5 text-xs font-medium rounded-lg transition-colors ${activeTab === 'replies' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' : 'text-zinc-500 dark:text-neutral-400 hover:bg-zinc-50 dark:hover:bg-neutral-800'}`}
                  >
                    Replies ({conversations.filter((c) => c.replied).length})
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto max-h-[50vh] sm:max-h-[calc(100vh-8rem)]">
                {loading ? (
                  <div className="p-6 text-center text-sm text-zinc-500 dark:text-neutral-400">
                    Loading…
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="p-6 text-center text-sm text-zinc-500 dark:text-neutral-400">
                    <Mail className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p>No conversations yet.</p>
                    <p className="mt-2">
                      Send Gmail drafts from your campaigns to see exchanges here.
                    </p>
                    <Link
                      href="/preferences"
                      className="inline-block mt-4 text-sky-600 dark:text-sky-400 hover:underline text-sm"
                    >
                      Connect Gmail
                    </Link>
                  </div>
                ) : displayedConversations.length === 0 ? (
                  <div className="p-6 text-center text-sm text-zinc-500 dark:text-neutral-400">
                    {activeTab === 'replies' ? 'No replies yet.' : activeTab === 'sent' ? 'No pending emails.' : 'No conversations.'}
                  </div>
                ) : (
                  <ul className="divide-y divide-zinc-100 dark:divide-neutral-800">
                    {displayedConversations.map((c) => (
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
                              {c.email || 'No email'}
                            </p>
                            {c.campaignName && (
                              <p className="text-xs text-zinc-500 dark:text-neutral-400 truncate">
                                {c.campaignName}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {c.replied && sentimentCache[c.id] && (
                              <SentimentBadge sentiment={sentimentCache[c.id]} size="xs" />
                            )}
                            {c.replied && !sentimentCache[c.id] && (
                              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                Replied
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
                  <p>Select a conversation to view messages.</p>
                </div>
              ) : threadLoading ? (
                <div className="flex-1 flex items-center justify-center p-8">
                  <p className="text-sm text-zinc-500 dark:text-neutral-400">Loading…</p>
                </div>
              ) : thread ? (
                <>
                  <div className="px-4 py-2.5 border-b border-zinc-200 dark:border-neutral-800 bg-zinc-50/50 dark:bg-neutral-800/30 shrink-0">
                    <h2 className="font-semibold text-zinc-900 dark:text-white text-sm sm:text-base">
                      {thread.email || selectedConv?.email || 'Lead'}
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
                        No messages in this thread.
                      </p>
                    ) : (
                      <>
                        {thread.messages.map((msg) => {
                          const sentiment = !msg.isFromUser ? (sentimentCache[msg.id] ?? sentimentCache[thread.leadId]) : null;
                          return (
                          <div
                            key={msg.id}
                            className={`flex ${msg.isFromUser ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[85%] flex flex-col gap-1.5 ${msg.isFromUser ? 'items-end' : 'items-start'}`}>
                              <div
                                className={`rounded-2xl px-4 py-2.5 ${
                                  msg.isFromUser
                                    ? 'bg-sky-500 text-white dark:bg-sky-400'
                                    : 'bg-zinc-100 dark:bg-neutral-700 text-zinc-900 dark:text-neutral-100'
                                }`}
                              >
                                <p className="text-xs opacity-80 mb-1">
                                  {msg.isFromUser ? 'You' : (msg.from || 'Lead')} · {formatDate(msg.date)}
                                </p>
                                <div className="text-sm whitespace-pre-wrap break-words">
                                  {msg.body || msg.snippet}
                                </div>
                              </div>
                              {!msg.isFromUser && sentiment && (
                                <SentimentBadge sentiment={sentiment} />
                              )}
                            </div>
                          </div>
                          );
                        })}
                        {/* Envois programmés — éditables avant l'envoi */}
                        {(thread.pendingQueueItems?.length ?? 0) > 0 && (
                          <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-neutral-700">
                            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-neutral-400 mb-3 flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              Scheduled sends
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
                                        placeholder="Subject"
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
                                          {savingQueueId === item.id ? 'Saving…' : 'Save'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => { setEditingQueueId(null); setEditSubject(item.subject); setEditBody(item.body); }}
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-200 dark:bg-neutral-600 text-zinc-800 dark:text-neutral-200 text-sm font-medium hover:bg-zinc-300 dark:hover:bg-neutral-500"
                                        >
                                          <X className="w-4 h-4" />
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-2 flex items-center gap-2">
                                        <Clock className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                                        <span>Scheduled at:</span>
                                        <span className="text-amber-800 dark:text-amber-200">
                                          {formatScheduledAt(item.scheduled_at) || item.scheduled_at || '—'}
                                        </span>
                                      </p>
                                      <p className="font-medium text-zinc-900 dark:text-white text-sm mb-1">{item.subject || '(No subject)'}</p>
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
                                        Edit
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
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500 dark:text-neutral-400 gap-3">
                  {threadErrorCode === 'GMAIL_TOKEN_REVOKED' ? (
                    <>
                      <p className="font-medium text-zinc-700 dark:text-zinc-300">Your Gmail session has expired.</p>
                      <p className="text-sm">You need to reconnect your Gmail account to view messages.</p>
                      <Link href="/preferences" className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium rounded-lg transition-colors">
                        Reconnect Gmail
                      </Link>
                    </>
                  ) : (
                    <>
                      <p>Unable to load the conversation.</p>
                      <p className="text-sm">Make sure Gmail is connected in <Link href="/preferences" className="text-sky-500 hover:underline">preferences</Link>.</p>
                    </>
                  )}
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
