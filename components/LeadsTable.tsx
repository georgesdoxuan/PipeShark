'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Search, Mail, X, Briefcase, MapPin, MessageCircle, FolderOpen, RefreshCw, CheckSquare, Square, Pencil, Save } from 'lucide-react';
import Image from 'next/image';

interface Lead {
  id: string;
  campaignId?: string | null;
  businessType: string | null;
  city: string | null;
  country?: string | null;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  url: string | null;
  draft: string | null;
  emailDraftCreated: boolean | null;
  draftCreatedDate: string | null;
  date: string | null;
  replied?: boolean;
  repliedAt?: string | null;
  gmailThreadId?: string | null;
  emailSent?: boolean;
  /** From email_queue when lead is in queue */
  deliveryType?: 'draft' | 'send' | null;
  scheduledAt?: string | null;
}

const selectClass = "text-sm font-medium text-zinc-700 dark:text-sky-200 bg-white dark:bg-neutral-800/80 border border-zinc-200 dark:border-sky-700/50 rounded-xl px-4 py-2.5 shadow-sm hover:border-sky-300 dark:hover:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 transition-colors cursor-pointer appearance-none bg-[length:14px] bg-[right_0.75rem_center] bg-no-repeat pr-9";
const selectChevron = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

const TONE_LABELS: Record<string, string> = {
  professional: 'Professional',
  casual: 'Casual / Friendly',
  direct: 'Direct / Bold',
  empathetic: 'Empathetic / Understanding',
};

interface LeadsTableProps {
  leads: Lead[];
  loading?: boolean;
  filterBusinessType?: string;
  filterCity?: string;
  filterByEmail?: boolean;
  /** 'all' | 'sent' (email sent only) | 'replied' (replies only) */
  filterView?: 'all' | 'sent' | 'replied';
  toneOfVoice?: string;
  campaignIdToTone?: Record<string, string>;
  campaignIdToName?: Record<string, string>;
  onDraftModalOpenChange?: (open: boolean) => void;
  onFilterBusinessTypeChange?: (value: string) => void;
  onFilterCityChange?: (value: string) => void;
  onFilterViewChange?: (value: 'all' | 'sent' | 'replied') => void;
  onRefresh?: () => void;
}

const filterBtnBase = "inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors disabled:opacity-50";
const filterBtnActive = "border-sky-500 bg-sky-500/15 text-sky-700 dark:text-sky-200 dark:bg-sky-500/20";
const filterBtnInactive = "border-zinc-200 dark:border-sky-700/50 bg-white dark:bg-neutral-800/80 text-zinc-700 dark:text-sky-200 hover:bg-zinc-50 dark:hover:bg-neutral-800 hover:border-zinc-300 dark:hover:border-sky-600";

export default function LeadsTable({ leads, loading = false, filterBusinessType = '', filterCity = '', filterByEmail = true, filterView = 'all', toneOfVoice, campaignIdToTone, campaignIdToName, onDraftModalOpenChange, onFilterBusinessTypeChange, onFilterCityChange, onFilterViewChange, onRefresh }: LeadsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [draftModal, setDraftModal] = useState<{ content: string; lead: Lead } | null>(null);
  const [draftEdit, setDraftEdit] = useState<{ subject: string; body: string } | null>(null);
  const [draftSaving, setDraftSaving] = useState(false);
  const itemsPerPage = 20;

  // Parse draft: first line = subject, rest = body (subject often at top, e.g. "Support for Your Plumbing Tools")
  const parseDraftSubjectAndBody = (content: string) => {
    const idx = content.indexOf('\n\n');
    if (idx >= 0) {
      return { subject: content.slice(0, idx).trim(), body: content.slice(idx + 2).trim() };
    }
    const firstLine = content.indexOf('\n') >= 0 ? content.slice(0, content.indexOf('\n')) : content;
    const subject = firstLine.trim();
    const body = content.slice(firstLine.length).trim();
    return { subject, body };
  };

  // Format date helper with time
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-GB', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return dateString;
    }
  };

  // Filter and sort leads
  const filteredAndSortedLeads = useMemo(() => {
    let filtered = Array.isArray(leads) ? [...leads] : [];

    // Optionally filter to targets with email (matches "Targets" count)
    if (filterByEmail) {
      filtered = filtered.filter(lead => 
        lead.email && 
        lead.email.trim() !== '' && 
        lead.email.toLowerCase() !== 'no email found'
      );
    }

    // Apply business type filter
    if (filterBusinessType.trim()) {
      filtered = filtered.filter(lead => 
        lead.businessType?.toLowerCase() === filterBusinessType.toLowerCase()
      );
    }

    // Apply city filter
    if (filterCity.trim()) {
      filtered = filtered.filter(lead => 
        lead.city?.toLowerCase() === filterCity.toLowerCase()
      );
    }

    // Apply view filter: all | email sent only | replies only
    if (filterView === 'sent') {
      filtered = filtered.filter(lead => !!lead.emailSent);
    } else if (filterView === 'replied') {
      filtered = filtered.filter(lead => !!lead.replied);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (lead) =>
          (lead.businessType?.toLowerCase().includes(query) ?? false) ||
          (lead.city?.toLowerCase().includes(query) ?? false) ||
          (lead.email?.toLowerCase().includes(query) ?? false)
      );
    }

    // Apply sorting by date (newest first or oldest first)
    filtered = [...filtered].sort((a, b) => {
      const aDate = a.date ? new Date(a.date).getTime() : 0;
      const bDate = b.date ? new Date(b.date).getTime() : 0;
      return sortOrder === 'newest' ? bDate - aDate : aDate - bDate;
    });

    return filtered;
  }, [leads, searchQuery, sortOrder, filterBusinessType, filterCity, filterByEmail, filterView]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedLeads.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLeads = filteredAndSortedLeads.slice(startIndex, startIndex + itemsPerPage);

  // Counts for filter labels (same base as table: after email + business type + city, before reply/emailSent)
  const filterCounts = useMemo(() => {
    let base = Array.isArray(leads) ? [...leads] : [];
    if (filterByEmail) {
      base = base.filter(lead =>
        lead.email && lead.email.trim() !== '' && lead.email.toLowerCase() !== 'no email found'
      );
    }
    if (filterBusinessType.trim()) {
      base = base.filter(lead => lead.businessType?.toLowerCase() === filterBusinessType.toLowerCase());
    }
    if (filterCity.trim()) {
      base = base.filter(lead => lead.city?.toLowerCase() === filterCity.toLowerCase());
    }
    const emailSentCount = base.filter(lead => !!lead.emailSent).length;
    const repliedCount = base.filter(lead => !!lead.replied).length;
    return { emailSentCount, repliedCount };
  }, [leads, filterByEmail, filterBusinessType, filterCity]);

  // Reset to page 1 when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterBusinessType, filterCity, filterView, sortOrder]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-zinc-600 dark:text-sky-200 font-medium">Loading targets...</p>
        </div>
      </div>
    );
  }

  if (!Array.isArray(leads) || leads.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-zinc-600 dark:text-sky-200 font-medium">No targets found</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      {/* Header with Search and Sort Order */}
      <div className="p-4 pb-3 border-b border-zinc-200 dark:border-sky-800/30">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-display font-bold text-zinc-900 dark:text-white">
                Leads ({filteredAndSortedLeads.length})
              </h2>
              {onRefresh && (
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-200 dark:border-sky-700/50 bg-white dark:bg-neutral-800/80 text-zinc-700 dark:text-sky-200 hover:bg-zinc-50 dark:hover:bg-neutral-800 hover:border-zinc-300 dark:hover:border-sky-600 transition-colors disabled:opacity-50 shadow-sm"
                  title="Refresh leads"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  <span className="text-sm font-medium">Refresh</span>
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {onFilterBusinessTypeChange && (
              <>
                <select
                  value={filterBusinessType}
                  onChange={(e) => onFilterBusinessTypeChange(e.target.value)}
                  className={selectClass}
                  style={{ backgroundImage: selectChevron }}
                  title="Filter by business type"
                >
                  <option value="">All types</option>
                  {[...new Set(leads.map((l) => l.businessType).filter((x): x is string => Boolean(x)))].sort().map((bt) => (
                    <option key={bt} value={bt}>{bt}</option>
                  ))}
                </select>
                <select
                  value={filterCity}
                  onChange={(e) => onFilterCityChange?.(e.target.value)}
                  className={selectClass}
                  style={{ backgroundImage: selectChevron }}
                  title="Filter by city"
                >
                  <option value="">All cities</option>
                  {[...new Set(leads.map((l) => l.city).filter((x): x is string => Boolean(x)))].sort().map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                {onFilterViewChange && (
                  <>
                    <button
                      type="button"
                      onClick={() => onFilterViewChange('all')}
                      className={`${filterBtnBase} ${filterView === 'all' ? filterBtnActive : filterBtnInactive}`}
                      title="Show all leads"
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => onFilterViewChange('sent')}
                      className={`${filterBtnBase} ${filterView === 'sent' ? filterBtnActive : filterBtnInactive}`}
                      title="Show only leads with email sent"
                    >
                      Email sent ({filterCounts.emailSentCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => onFilterViewChange('replied')}
                      className={`${filterBtnBase} ${filterView === 'replied' ? filterBtnActive : filterBtnInactive}`}
                      title="Show only leads who replied"
                    >
                      Replies ({filterCounts.repliedCount})
                    </button>
                  </>
                )}
              </>
            )}
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
              className={selectClass}
              style={{ backgroundImage: selectChevron }}
            >
              <option value="newest">Most recent</option>
              <option value="oldest">Oldest</option>
            </select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-500 dark:text-sky-300" />
              <input
                type="text"
                placeholder="Search by business type, city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 pl-10 pr-4 py-2.5 border border-zinc-200 dark:border-sky-700/50 rounded-xl bg-white dark:bg-neutral-800/80 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-sky-400/70 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 transition-all shadow-sm hover:border-sky-300 dark:hover:border-sky-600"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table - min-width + auto layout so columns don't overlap and horizontal scroll works */}
      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-sky-700/40">
        <table className="w-full min-w-[1100px]" style={{ tableLayout: 'auto' }}>
          <thead className="bg-sky-500/75 dark:bg-sky-600/75 border-b border-sky-500/60 dark:border-sky-600/60">
            <tr>
              <th className="px-4 py-3.5 text-left text-sm font-display font-semibold tracking-wide text-white/95 whitespace-nowrap w-0 rounded-tl-xl">
                Business Type
              </th>
              <th className="px-4 py-3.5 text-left text-sm font-display font-semibold tracking-wide text-white/95 whitespace-nowrap w-0">
                City
              </th>
              <th className="px-4 py-3.5 text-left text-sm font-display font-semibold tracking-wide text-white/95 whitespace-nowrap">
                Email
              </th>
              <th className="px-4 py-3.5 text-left text-sm font-display font-semibold tracking-wide text-white/95 whitespace-nowrap w-0">
                Phone
              </th>
              <th className="px-4 py-3.5 text-left text-sm font-display font-semibold tracking-wide text-white/95 whitespace-nowrap w-0">
                URL
              </th>
              <th className="px-4 py-3.5 text-left text-sm font-display font-semibold tracking-wide text-white/95 whitespace-nowrap" style={{ maxWidth: 100, width: 100 }}>
                LinkedIn
              </th>
              <th className="px-4 py-3.5 text-left text-sm font-display font-semibold tracking-wide text-white/95 whitespace-nowrap w-0">
                Draft
              </th>
              <th className="px-4 py-3.5 text-left text-sm font-display font-semibold tracking-wide text-white/95 whitespace-nowrap w-0">
                Sent
              </th>
              <th className="px-4 py-3.5 text-left text-sm font-display font-semibold tracking-wide text-white/95 whitespace-nowrap w-0">
                Delivery type
              </th>
              <th className="px-4 py-3.5 text-left text-sm font-display font-semibold tracking-wide text-white/95 whitespace-nowrap w-0">
                Scheduled at
              </th>
              <th className="px-4 py-3.5 text-left text-sm font-display font-semibold tracking-wide text-white/95 whitespace-nowrap w-0">
                Reply
              </th>
              <th className="px-4 py-3.5 text-left text-sm font-display font-semibold tracking-wide text-white/95 whitespace-nowrap" style={{ minWidth: 145 }}>
                Date
              </th>
              <th className="px-4 py-3.5 text-left text-sm font-display font-semibold tracking-wide text-white/95 whitespace-nowrap rounded-tr-xl" style={{ minWidth: 100 }}>
                Campaign
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-neutral-900/95 divide-y divide-zinc-200 dark:divide-sky-800/30">
            {paginatedLeads.length === 0 ? (
              <tr>
                <td colSpan={13} className="px-6 py-12 text-center">
                  <p className="text-zinc-600 dark:text-sky-200">
                    {searchQuery.trim() 
                      ? `No results for "${searchQuery}"` 
                      : 'No targets to display'}
                  </p>
                </td>
              </tr>
            ) : (
              paginatedLeads.map((lead) => (
              <tr
                key={lead.id}
                className="hover:bg-zinc-50 dark:hover:bg-neutral-800/80 transition-colors"
              >
                <td className="px-4 py-4">
                  <div className="text-sm font-semibold text-zinc-900 dark:text-white truncate" title={lead.businessType || undefined}>
                    {lead.businessType || '-'}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm text-zinc-600 dark:text-sky-200 truncate" title={lead.city || undefined}>
                    {lead.city || '-'}
                  </div>
                </td>
                <td className="px-4 py-4">
                  {lead.email && lead.email !== 'No email found' ? (
                    <div className="flex items-center gap-2 min-w-0">
                      <Mail className="w-4 h-4 text-sky-500 dark:text-sky-300 flex-shrink-0" />
                      <span className="text-sm text-zinc-900 dark:text-white font-medium truncate" title={lead.email}>{lead.email}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-zinc-500 dark:text-sky-400/90 italic">
                      No email found
                    </span>
                  )}
                </td>
                <td className="px-4 py-4">
                  {lead.phone ? (
                    <a
                      href={`tel:${lead.phone}`}
                      className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:underline transition-colors truncate block"
                      title={lead.phone}
                    >
                      {lead.phone}
                    </a>
                  ) : (
                    <span className="text-sm text-zinc-500 dark:text-sky-400/90">-</span>
                  )}
                </td>
                <td className="px-4 py-4">
                  {lead.url ? (
                    <a
                      href={lead.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center p-2 w-9 h-9 rounded-lg transition-colors hover:bg-sky-50 dark:hover:bg-sky-500/10"
                      title={lead.url}
                      aria-label="Open URL"
                    >
                      <Image src="/url.png" alt="URL" width={20} height={20} className="object-contain w-5 h-5 [filter:brightness(0)_saturate(100%)_invert(52%)_sepia(89%)_saturate(1500%)_hue-rotate(186deg)] dark:[filter:brightness(0)_saturate(100%)_invert(65%)_sepia(60%)_saturate(800%)_hue-rotate(186deg)]" />
                    </a>
                  ) : (
                    <span className="text-sm text-zinc-500 dark:text-sky-400/90">-</span>
                  )}
                </td>
                <td className="px-4 py-4 max-w-[100px] w-[100px]" style={{ maxWidth: 100 }}>
                  {lead.linkedin && lead.linkedin.trim() !== '' && lead.linkedin.toLowerCase() !== 'no linkedin found' ? (
                    <a
                      href={lead.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:underline transition-colors block truncate"
                      title={lead.linkedin}
                    >
                      <span className="truncate block font-semibold text-sky-600 dark:text-sky-400">LK</span>
                    </a>
                  ) : (
                    <span className="text-sm text-zinc-500 dark:text-sky-400/90">-</span>
                  )}
                </td>
                <td className="px-4 py-4">
                  {lead.emailDraftCreated ? (
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          const text = lead.draft?.trim() || 'No draft text available.';
                          setDraftEdit(null);
                          setDraftModal({ content: text, lead });
                          onDraftModalOpenChange?.(true);
                        }}
                        className="inline-flex items-center justify-center p-2 w-10 h-10 rounded-lg cursor-pointer hover:bg-sky-50 dark:hover:bg-sky-500/10 transition-colors"
                        title="Draft"
                      >
                        <Image src="/draft.png" alt="Draft" width={24} height={24} className="object-contain w-6 h-6 [filter:brightness(0)_saturate(100%)_invert(52%)_sepia(89%)_saturate(1500%)_hue-rotate(186deg)] dark:[filter:brightness(0)_saturate(100%)_invert(65%)_sepia(60%)_saturate(800%)_hue-rotate(186deg)]" />
                      </button>
                    </div>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-yellow-500/20 text-amber-700 dark:text-yellow-300 border border-amber-200 dark:border-yellow-500/30">
                      Pending
                    </span>
                  )}
                </td>
                <td className="px-4 py-4 w-0">
                  <span className="inline-flex items-center justify-center" title={lead.emailSent ? 'Email sent' : 'Not sent yet'}>
                    {lead.emailSent ? (
                      <CheckSquare className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" aria-hidden />
                    ) : (
                      <Square className="w-5 h-5 text-zinc-300 dark:text-zinc-500 shrink-0" aria-hidden />
                    )}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  {lead.deliveryType === 'draft' ? (
                    <span className="text-xs font-medium text-sky-700 dark:text-sky-300">Draft</span>
                  ) : lead.deliveryType === 'send' ? (
                    <span className="text-xs font-medium text-sky-700 dark:text-sky-300">Send</span>
                  ) : (
                    <span className="text-sm text-zinc-500 dark:text-sky-400/90">-</span>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  {lead.scheduledAt ? (
                    <span className="text-sm text-zinc-600 dark:text-sky-200">{formatDate(lead.scheduledAt)}</span>
                  ) : (
                    <span className="text-sm text-zinc-500 dark:text-sky-400/90">-</span>
                  )}
                </td>
                <td className="px-4 py-4">
                  {lead.replied ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-500/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-500/30">
                      ✅ Replied
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center p-2 w-10 h-10 rounded-lg" title="Pending">
                      <Image src="/hourglass.png" alt="Pending" width={24} height={24} className="object-contain w-6 h-6 [filter:brightness(0)_saturate(100%)_invert(58%)] dark:[filter:brightness(0)_saturate(100%)_invert(70%)]" />
                    </span>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap" style={{ minWidth: 145 }}>
                  <div className="text-sm text-zinc-600 dark:text-sky-200">
                    {formatDate(lead.date)}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap" style={{ minWidth: 100 }}>
                  {lead.campaignId && (campaignIdToName?.[lead.campaignId] != null) ? (
                    <Link
                      href={`/campaigns/${lead.campaignId}`}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 hover:underline truncate"
                      title={campaignIdToName[lead.campaignId]}
                    >
                      <FolderOpen className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{campaignIdToName[lead.campaignId]}</span>
                    </Link>
                  ) : (
                    <span className="text-sm text-zinc-500 dark:text-sky-400/90">-</span>
                  )}
                </td>
              </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Draft text modal – centered on screen */}
      {draftModal !== null && (() => {
        const { subject, body } = parseDraftSubjectAndBody(draftModal.content);
        const { lead } = draftModal;
        const isEditing = draftEdit !== null;
        const displaySubject = isEditing ? draftEdit.subject : subject;
        const displayBody = isEditing ? draftEdit.body : (body || (subject ? '' : draftModal.content));
        const cityLabel = lead.city && lead.country ? `${lead.city}, ${lead.country}` : lead.city || null;
        const toneForLead = (lead.campaignId && campaignIdToTone?.[lead.campaignId]) || toneOfVoice;
        const toneLabel = toneForLead ? TONE_LABELS[toneForLead] || toneForLead : null;
        const pillItems: { key: string; icon: React.ReactNode; label: string }[] = [];
        if (lead.businessType) pillItems.push({ key: 'type', icon: <Briefcase className="w-3 h-3 shrink-0" />, label: lead.businessType });
        if (cityLabel) pillItems.push({ key: 'city', icon: <MapPin className="w-3 h-3 shrink-0" />, label: cityLabel });
        if (lead.email) pillItems.push({ key: 'email', icon: <Mail className="w-3 h-3 shrink-0" />, label: lead.email });
        if (toneLabel) pillItems.push({ key: 'tone', icon: <MessageCircle className="w-3 h-3 shrink-0" />, label: toneLabel });

        async function handleSaveDraft() {
          if (!draftEdit || !lead) return;
          setDraftSaving(true);
          try {
            const res = await fetch(`/api/leads/${lead.id}/draft`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ subject: draftEdit.subject, body: draftEdit.body }),
              credentials: 'include',
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.success) {
              const newContent = draftEdit.subject && draftEdit.body
                ? `${draftEdit.subject}\n\n${draftEdit.body}`
                : draftEdit.subject || draftEdit.body || '';
              setDraftModal((prev) => (prev ? { ...prev, content: newContent } : null));
              setDraftEdit(null);
              onRefresh?.();
            }
          } finally {
            setDraftSaving(false);
          }
        }

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => { setDraftModal(null); setDraftEdit(null); onDraftModalOpenChange?.(false); }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="draft-modal-title"
          >
            <div
              className="relative bg-white dark:bg-neutral-900 rounded-xl shadow-xl border border-zinc-200 dark:border-sky-700/40 max-w-2xl w-full max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-zinc-200 dark:border-sky-700/40">
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
                  <h2 id="draft-modal-title" className="text-lg font-semibold text-sky-600 dark:text-sky-400 shrink-0">
                    Email draft
                  </h2>
                  {pillItems.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {pillItems.map(({ key, icon, label }) => (
                        <span
                          key={key}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-normal text-zinc-600 dark:text-zinc-400 bg-zinc-200 dark:bg-neutral-700 rounded-full"
                        >
                          {icon}
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {!isEditing ? (
                    <button
                      type="button"
                      onClick={() => setDraftEdit({ subject: subject || '', body: body || (subject ? '' : draftModal.content) })}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-500/10 border border-sky-200 dark:border-sky-700/50 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                      Edit
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setDraftEdit(null)}
                        className="px-3 py-2 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-neutral-800 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveDraft}
                        disabled={draftSaving}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        {draftSaving ? 'Saving…' : 'Save'}
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => { setDraftModal(null); setDraftEdit(null); onDraftModalOpenChange?.(false); }}
                    className="p-2 rounded-lg text-zinc-500 dark:text-sky-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-neutral-800 transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-4 overflow-y-auto flex-1">
                {isEditing ? (
                  <>
                    <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Subject</label>
                    <input
                      type="text"
                      value={displaySubject}
                      onChange={(e) => setDraftEdit((prev) => prev ? { ...prev, subject: e.target.value } : null)}
                      className="w-full rounded-lg border border-zinc-300 dark:border-sky-700/50 bg-white dark:bg-neutral-800 text-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm mb-3 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                      placeholder="Subject"
                    />
                    <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Body</label>
                    <textarea
                      value={displayBody}
                      onChange={(e) => setDraftEdit((prev) => prev ? { ...prev, body: e.target.value } : null)}
                      rows={12}
                      className="w-full rounded-lg border border-zinc-300 dark:border-sky-700/50 bg-white dark:bg-neutral-800 text-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm font-sans whitespace-pre-wrap resize-y focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                      placeholder="Email body"
                    />
                  </>
                ) : (
                  <>
                    {displaySubject && (
                      <p className="text-sm text-zinc-700 dark:text-sky-200 mb-3">
                        <span className="font-bold">Subject : </span>
                        {displaySubject}
                      </p>
                    )}
                    <pre className="text-sm text-zinc-700 dark:text-sky-200 whitespace-pre-wrap font-sans">
                      {displayBody}
                    </pre>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-sky-800/30 flex items-center justify-between">
          <div className="text-sm text-zinc-600 dark:text-sky-200">
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredAndSortedLeads.length)} of{' '}
            {filteredAndSortedLeads.length} targets
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm font-semibold text-zinc-700 dark:text-sky-200 bg-zinc-100 dark:bg-neutral-800/80 border border-zinc-300 dark:border-sky-700/40 rounded-xl hover:bg-zinc-200 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      currentPage === pageNum
                        ? 'bg-sky-600 dark:bg-sky-700 text-white'
                        : 'text-zinc-700 dark:text-sky-200 bg-zinc-100 dark:bg-neutral-800/80 border border-zinc-300 dark:border-sky-700/40 hover:bg-zinc-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm font-semibold text-zinc-700 dark:text-sky-200 bg-zinc-100 dark:bg-neutral-800/80 border border-zinc-300 dark:border-sky-700/40 rounded-xl hover:bg-zinc-200 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
