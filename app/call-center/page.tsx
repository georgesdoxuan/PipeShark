'use client';

import { useEffect, useState, useCallback } from 'react';
import Header from '@/components/Header';
import { Search, Mail, Phone, FolderPlus, RefreshCw, Check, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface Lead {
  id: string;
  campaignId?: string | null;
  name?: string | null;
  businessType: string | null;
  city: string | null;
  country?: string | null;
  email: string | null;
  phone: string | null;
  url: string | null;
  preparationSummary?: string | null;
  callNotes?: string | null;
  called?: boolean;
  comments?: string | null;
  folderId?: string | null;
  date?: string | null;
}

interface Campaign {
  id: string;
  name?: string | null;
  businessType?: string;
}

interface Folder {
  id: string;
  name: string;
}

const ITEMS_PER_PAGE = 20;

export default function CallCenterPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [campaignFilterId, setCampaignFilterId] = useState<string>('');
  const [page, setPage] = useState(1);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch('/api/leads', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch leads');
      const data = await res.json();
      setLeads(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setLeads([]);
    }
  }, []);

  const fetchFolders = useCallback(async () => {
    try {
      const res = await fetch('/api/call-center/folders', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch folders');
      const data = await res.json();
      setFolders(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setFolders([]);
    }
  }, []);

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await fetch('/api/campaigns/list', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      setCampaigns(Array.isArray(data) ? data : []);
    } catch {
      setCampaigns([]);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchLeads(), fetchFolders(), fetchCampaigns()]).finally(() => setLoading(false));
  }, [fetchLeads, fetchFolders, fetchCampaigns]);

  const updateLead = async (leadId: string, updates: Partial<{ call_notes: string; called: boolean; comments: string; folder_id: string | null }>) => {
    setUpdatingLeadId(leadId);
    try {
      const res = await fetch(`/api/leads/${leadId}/call-center`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
        credentials: 'include',
      });
      if (res.ok) {
        setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, ...updates } : l)));
      }
    } finally {
      setUpdatingLeadId(null);
    }
  };

  const createFolder = async () => {
    const name = newFolderName.trim();
    if (!name || creatingFolder) return;
    setCreatingFolder(true);
    try {
      const res = await fetch('/api/call-center/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.id) {
        setFolders((prev) => [...prev, { id: data.id, name: data.name }]);
        setNewFolderName('');
      }
    } finally {
      setCreatingFolder(false);
    }
  };

  const filteredLeads = leads.filter((l) => {
    if (campaignFilterId && l.campaignId !== campaignFilterId) return false;
    const q = search.toLowerCase();
    if (!q) return true;
    const name = (l.name ?? '').toLowerCase();
    const business = (l.businessType ?? '').toLowerCase();
    const city = (l.city ?? '').toLowerCase();
    const email = (l.email ?? '').toLowerCase();
    return name.includes(q) || business.includes(q) || city.includes(q) || email.includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / ITEMS_PER_PAGE));
  const paginatedLeads = filteredLeads.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const formatDate = (d: string | null | undefined) => {
    if (!d) return '—';
    try {
      return new Intl.DateTimeFormat('en-GB', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(d));
    } catch {
      return d;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100/60 dark:bg-black/70 relative">
      <Header />
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl font-display font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Image src="/phone-receiver-silhouette.png" alt="" width={28} height={28} className="w-7 h-7 object-contain brightness-0 dark:brightness-0 dark:invert" />
            Call Center
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => { setLoading(true); Promise.all([fetchLeads(), fetchFolders(), fetchCampaigns()]).finally(() => setLoading(false)); }}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-200 dark:border-sky-700/50 bg-white dark:bg-neutral-800 text-zinc-700 dark:text-sky-200 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50"
              title="Refresh leads"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Create folder */}
        <div className="mb-6 p-4 rounded-xl bg-white dark:bg-neutral-800/80 border border-zinc-200 dark:border-sky-800/50 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <FolderPlus className="w-5 h-5 text-sky-500 dark:text-sky-400" />
            <span className="text-sm font-medium text-zinc-700 dark:text-sky-200">New folder</span>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createFolder()}
              placeholder="Folder name"
              className="flex-1 min-w-[160px] px-3 py-2 rounded-lg border border-zinc-200 dark:border-sky-700/50 bg-white dark:bg-neutral-900 text-zinc-900 dark:text-white text-sm placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            />
            <button
              type="button"
              onClick={createFolder}
              disabled={!newFolderName.trim() || creatingFolder}
              className="px-4 py-2 rounded-lg bg-sky-500 text-white text-sm font-medium hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creatingFolder ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
            </button>
          </div>
        </div>

        {/* Campaign filter + Search */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-500 dark:text-sky-400 whitespace-nowrap">Campaign</span>
            <select
              value={campaignFilterId}
              onChange={(e) => { setCampaignFilterId(e.target.value); setPage(1); }}
              className="text-sm rounded-lg border border-zinc-200 dark:border-sky-700/50 bg-white dark:bg-neutral-800 text-zinc-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500/30 min-w-[140px]"
            >
              <option value="">All campaigns</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.name || c.businessType || c.id.slice(0, 8)}</option>
              ))}
            </select>
          </div>
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 dark:text-sky-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name, business, city, email..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-sky-700/50 bg-white dark:bg-neutral-800 text-zinc-900 dark:text-white placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-sky-700/40 bg-white dark:bg-neutral-900/95 shadow-sm">
            <table className="w-full min-w-[1000px]" style={{ tableLayout: 'auto' }}>
              <thead className="bg-sky-500/75 dark:bg-sky-600/75 border-b border-sky-500/60">
                <tr>
                  <th className="px-3 py-3 text-left text-sm font-semibold text-white/95 whitespace-nowrap">Name</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold text-white/95 whitespace-nowrap">Business</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold text-white/95 whitespace-nowrap">City</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold text-white/95 whitespace-nowrap">Phone</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold text-white/95 whitespace-nowrap w-0">URL</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold text-white/95 whitespace-nowrap" style={{ minWidth: 180 }}>Preparation</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold text-white/95 whitespace-nowrap" style={{ minWidth: 140 }}>Notes</th>
                  <th className="px-3 py-3 text-center text-sm font-semibold text-white/95 whitespace-nowrap w-0">Called</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold text-white/95 whitespace-nowrap" style={{ minWidth: 140 }}>Comments</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold text-white/95 whitespace-nowrap" style={{ minWidth: 120 }}>Folder</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold text-white/95 whitespace-nowrap rounded-tr-xl" style={{ minWidth: 160 }}>Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-sky-800/30">
                {paginatedLeads.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-6 py-12 text-center text-zinc-500 dark:text-sky-400">
                      {search.trim() ? `No leads match "${search}"` : 'No leads yet'}
                    </td>
                  </tr>
                ) : (
                  paginatedLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-zinc-50/80 dark:hover:bg-neutral-800/50">
                      <td className="px-3 py-3 text-sm font-medium text-zinc-900 dark:text-white">{lead.name || '—'}</td>
                      <td className="px-3 py-3 text-sm text-zinc-700 dark:text-sky-200">{lead.businessType || '—'}</td>
                      <td className="px-3 py-3 text-sm text-zinc-600 dark:text-sky-200">{lead.city ? (lead.country ? `${lead.city}, ${lead.country}` : lead.city) : '—'}</td>
                      <td className="px-3 py-3 text-sm">
                        {lead.phone ? (
                          <a href={`tel:${lead.phone}`} className="text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 shrink-0" />
                            {lead.phone}
                          </a>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {lead.url ? (
                          <a href={lead.url} target="_blank" rel="noopener noreferrer" className="inline-flex p-1.5 rounded-lg hover:bg-sky-100 dark:hover:bg-sky-500/10" title={lead.url} aria-label="Open URL">
                            <Image src="/link.png" alt="" width={18} height={18} className="object-contain w-[18px] h-[18px] [filter:brightness(0)_invert(50%)] dark:[filter:brightness(0)_invert(70%)]" />
                          </a>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-sm text-zinc-600 dark:text-sky-200 max-w-[220px]">
                        <div className="line-clamp-4 text-xs bg-zinc-50 dark:bg-neutral-800/80 rounded-lg p-2 border border-zinc-100 dark:border-sky-800/50" title={lead.preparationSummary ?? undefined}>
                          {lead.preparationSummary ? lead.preparationSummary : '—'}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <textarea
                          value={lead.callNotes ?? ''}
                          onChange={(e) => setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, callNotes: e.target.value } : l)))}
                          onBlur={(e) => { const v = e.target.value; if (v !== (lead.callNotes ?? '')) updateLead(lead.id, { call_notes: v }); }}
                          placeholder="Notes for call..."
                          rows={2}
                          className="w-full min-w-[120px] px-2 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-sky-700/50 bg-white dark:bg-neutral-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-sky-500/50 resize-y max-h-24"
                        />
                      </td>
                      <td className="px-3 py-3 text-center">
                        {updatingLeadId === lead.id ? (
                          <Loader2 className="w-5 h-5 animate-spin text-sky-500 mx-auto" />
                        ) : (
                          <button
                            type="button"
                            onClick={() => updateLead(lead.id, { called: !lead.called })}
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border-2 transition-colors ${lead.called ? 'bg-green-500 border-green-500 text-white' : 'border-zinc-300 dark:border-sky-600 bg-white dark:bg-neutral-800 hover:border-sky-500'}`}
                            title={lead.called ? 'Mark as not called' : 'Mark as called'}
                          >
                            {lead.called && <Check className="w-4 h-4" />}
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="text"
                          value={lead.comments ?? ''}
                          onChange={(e) => setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, comments: e.target.value } : l)))}
                          onBlur={(e) => { const v = e.target.value; if (v !== (lead.comments ?? '')) updateLead(lead.id, { comments: v }); }}
                          placeholder="Comments..."
                          className="w-full min-w-[100px] px-2 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-sky-700/50 bg-white dark:bg-neutral-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-sky-500/50"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <select
                          value={lead.folderId ?? ''}
                          onChange={(e) => updateLead(lead.id, { folder_id: e.target.value || null })}
                          className="text-xs rounded-lg border border-zinc-200 dark:border-sky-700/50 bg-white dark:bg-neutral-800 text-zinc-900 dark:text-white px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500/50 min-w-[100px]"
                        >
                          <option value="">—</option>
                          {folders.map((f) => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-3 text-sm">
                        {lead.email && lead.email !== 'No email found' ? (
                          <a href={`mailto:${lead.email}`} className="text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 truncate max-w-[200px]">
                            <Mail className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{lead.email}</span>
                          </a>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-200 dark:border-sky-800/50 bg-zinc-50/50 dark:bg-neutral-800/30">
                <span className="text-sm text-zinc-600 dark:text-sky-300">
                  {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filteredLeads.length)} of {filteredLeads.length}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-sky-700/50 text-sm font-medium disabled:opacity-50 hover:bg-zinc-100 dark:hover:bg-neutral-700"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-sky-700/50 text-sm font-medium disabled:opacity-50 hover:bg-zinc-100 dark:hover:bg-neutral-700"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
