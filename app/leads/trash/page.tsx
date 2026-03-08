'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Link from 'next/link';
import { Trash2, RotateCcw, ArrowLeft, Mail } from 'lucide-react';

interface TrashedLead {
  id: string;
  name?: string | null;
  businessType: string | null;
  city: string | null;
  email: string | null;
  date: string | null;
}

export default function TrashPage() {
  const [leads, setLeads] = useState<TrashedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState(false);

  async function fetchLeads() {
    setLoading(true);
    try {
      const res = await fetch('/api/leads/trash');
      if (res.ok) setLeads(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchLeads(); }, []);

  async function doAction(leadIds: string[], action: 'restore' | 'delete') {
    setActionLoading(true);
    try {
      await fetch('/api/leads/trash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds, action }),
      });
      await fetchLeads();
      setSelectedIds(new Set());
    } finally {
      setActionLoading(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  return (
    <>
      <Header />
      <main className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Trash2 className="w-6 h-6 text-zinc-400" />
            Trash
          </h1>
          {leads.length > 0 && (
            <span className="text-sm text-zinc-500 dark:text-zinc-400">({leads.length})</span>
          )}
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-neutral-800 rounded-xl border border-zinc-200 dark:border-neutral-700">
            <span className="text-sm text-zinc-600 dark:text-zinc-300">{selectedIds.size} selected</span>
            <button
              type="button"
              onClick={() => doAction([...selectedIds], 'restore')}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-sky-500 hover:bg-sky-600 text-white transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              Restore
            </button>
            <button
              type="button"
              onClick={() => doAction([...selectedIds], 'delete')}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Delete permanently
            </button>
          </div>
        )}

        {leads.length > 0 && selectedIds.size === 0 && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => doAction(leads.map(l => l.id), 'delete')}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Empty trash
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-40 text-zinc-400">Loading…</div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-zinc-400 gap-2">
            <Trash2 className="w-8 h-8 opacity-40" />
            <p className="text-sm">Trash is empty</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-neutral-800">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="bg-zinc-50 dark:bg-neutral-800 border-b border-zinc-200 dark:border-neutral-700">
                  <th className="px-4 py-3 w-10" title="Sélection individuelle uniquement" />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Business</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">City</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-neutral-900 divide-y divide-zinc-100 dark:divide-neutral-800">
                {leads.map(lead => (
                  <tr key={lead.id} className={`transition-colors ${selectedIds.has(lead.id) ? 'bg-sky-50 dark:bg-sky-900/10' : 'hover:bg-zinc-50 dark:hover:bg-neutral-800/50'}`}>
                    <td className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(lead.id)}
                        onChange={() => toggleSelect(lead.id)}
                        className="w-4 h-4 rounded accent-sky-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-white">{lead.name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-300">{lead.businessType || '-'}</td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-300">{lead.city || '-'}</td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-300">
                      {lead.email ? (
                        <span className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-zinc-400" />
                          {lead.email}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => doAction([lead.id], 'restore')}
                          disabled={actionLoading}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 border border-sky-200 dark:border-sky-800 transition-colors disabled:opacity-50"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Restore
                        </button>
                        <button
                          type="button"
                          onClick={() => doAction([lead.id], 'delete')}
                          disabled={actionLoading}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
