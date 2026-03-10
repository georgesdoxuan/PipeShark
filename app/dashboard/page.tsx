'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import Header from '@/components/Header';
import LeadsTable from '@/components/LeadsTable';
import StatsCards from '@/components/StatsCards';
import CreditsGauge from '@/components/CreditsGauge';
import { useApiPause } from '@/contexts/ApiPauseContext';
import { useSidebar } from '@/contexts/SidebarContext';
import Image from 'next/image';
import { Plus, Calendar, MapPin, Trash2, X, AlertTriangle, Mail, Clock, Pencil, MailCheck, MailX, CheckSquare, Square, MoreVertical, ChevronDown, Check, Power, Zap } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface Campaign {
  id: string;
  name?: string;
  businessType: string;
  cities?: string[];
  citySize?: string;
  numberCreditsUsed?: number;
  createdAt: string;
  status: 'active' | 'completed';
  toneOfVoice?: string;
  /** city name -> country (from list API) for display "City, Country" */
  countryByCity?: Record<string, string>;
  /** date of the most recent lead for this campaign (from list API) */
  lastLeadAt?: string;
  /** hex color for title on card (persisted in Supabase) */
  titleColor?: string | null;
}

/** Dark color variants for campaign titles (deterministic from id when not yet saved). */
// Couleurs douces mais plus présentes (moins cassées)
const CAMPAIGN_TITLE_COLORS = [
  '#0d9488', '#4361ee', '#7c3aed', '#b45309', '#047857',
  '#0369a1', '#6d28d9', '#15803d', '#c2410c', '#475569',
  '#0e7490', '#a16207', '#5b21b6', '#4b5563', '#1d4ed8',
];

function getCampaignTitleColor(campaign: Campaign): string {
  if (campaign.titleColor?.trim()) return campaign.titleColor.trim();
  const hash = campaign.id.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0) | 0;
  return CAMPAIGN_TITLE_COLORS[Math.abs(hash) % CAMPAIGN_TITLE_COLORS.length];
}

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
  deliveryType?: 'draft' | 'send' | null;
  scheduledAt?: string | null;
  queueItemId?: string | null;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState({
    leadsWithEmail: 0,
    conversionRate: '0',
    emailsSent: 0,
    repliesCount: 0,
    replyRate: '0',
    avgTimeToReplyHours: null as string | null,
    positiveRepliesCount: 0,
    openRate: '0',
    openedCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [filterBusinessType, setFilterBusinessType] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterView, setFilterView] = useState<'all' | 'sent' | 'replied'>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<{ campaignId: string; campaignName: string } | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [showAllCampaigns, setShowAllCampaigns] = useState(false);
  const [scheduleTime, setScheduleTime] = useState<string>('09:00');
  const [scheduledCampaignIds, setScheduledCampaignIds] = useState<string[]>([]);
  const [launchDeliveryMode, setLaunchDeliveryMode] = useState<'drafts' | 'queue'>('queue');
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [enqueueLoading, setEnqueueLoading] = useState(false);
  const [enqueueFeedback, setEnqueueFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deliveryDropdownOpen, setDeliveryDropdownOpen] = useState(false);
  const deliveryDropdownRef = useRef<HTMLDivElement>(null);
  const [leadsEnqueueFeedback, setLeadsEnqueueFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [autoEnqueueEnabled, setAutoEnqueueEnabled] = useState(true);
  const [leadsCampaignFilterId, setLeadsCampaignFilterId] = useState<string | null>(null);
  const [statsPeriod, setStatsPeriod] = useState<'week' | 'month' | 'all'>('month');
  const statsPeriodRef = useRef<'week' | 'month' | 'all'>('month');
  // Keep ref in sync so closures (fetchLeads, interval) always read the current period
  useEffect(() => { statsPeriodRef.current = statsPeriod; }, [statsPeriod]);

  useEffect(() => {
    const stored = localStorage.getItem('pipeshark-auto-enqueue');
    if (stored === 'false') setAutoEnqueueEnabled(false);
  }, []);
  const [showScheduleCampaignsModal, setShowScheduleCampaignsModal] = useState(false);
  const [scheduleModalSelectedIds, setScheduleModalSelectedIds] = useState<string[]>([]);
  const [dailyLimit, setDailyLimit] = useState(300);
  const [repliesByDay, setRepliesByDay] = useState<{ date: string; count: number; positiveCount: number; label?: string }[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [openMenuCampaignId, setOpenMenuCampaignId] = useState<string | null>(null);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);
  const [gmailLoading, setGmailLoading] = useState(true);
  const [gmailError, setGmailError] = useState<string | null>(null);
  const [nextQueueAt, setNextQueueAt] = useState<string | null>(null);
  const [sentToday, setSentToday] = useState(0);
  const [draftToday, setDraftToday] = useState(0);
  const searchParams = useSearchParams();
  const { sidebarOpen } = useSidebar();
  const draftModalOpenRef = useRef(false);
  const leadsSectionRef = useRef<HTMLDivElement>(null);
  const titleColorPersistedRef = useRef<Set<string>>(new Set());

  const { isPaused } = useApiPause();

  const displayedLeads = leads;

  const todayLeads = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return leads.filter(l => l.date && l.date.startsWith(today));
  }, [leads]);

  const todayCampaignName = useMemo(() => {
    if (todayLeads.length === 0) return null;
    const campaignId = todayLeads[0].campaignId;
    const c = campaigns.find(x => x.id === campaignId);
    return c?.name || c?.businessType || null;
  }, [todayLeads, campaigns]);

  const repliesToday = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return repliesByDay.find(r => r.date === today)?.count ?? 0;
  }, [repliesByDay]);

  useEffect(() => {
    if (searchParams.get('leads') === 'today' && !loadingLeads && leadsSectionRef.current) {
      leadsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [searchParams, loadingLeads]);

  const displayedCampaigns = useMemo(() => {
    const sorted = [...campaigns].sort((a, b) => {
      const aDate = a.lastLeadAt ?? a.createdAt;
      const bDate = b.lastLeadAt ?? b.createdAt;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
    return showAllCampaigns ? sorted : sorted.slice(0, 4);
  }, [campaigns, showAllCampaigns]);

  useEffect(() => {
    if (isPaused) return;
    fetch(`/api/campaigns?period=${statsPeriod}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setStats(d); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statsPeriod]);

  useEffect(() => {
    // Only fetch if not paused
    if (!isPaused) {
      fetchCampaigns();
      fetchLeads();
      fetchSchedule();
      fetchRepliesByDay();
    }
    fetch('/api/campaigns/count-today')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d && typeof d.limit === 'number') setDailyLimit(d.limit); })
      .catch(() => {});
    // Refresh every 2 min (only if not paused and draft modal is closed)
    const interval = setInterval(() => {
      if (!isPaused && !draftModalOpenRef.current) {
        fetchCampaigns();
        fetchLeads();
        fetchSchedule();
        fetchRepliesByDay();
      }
    }, 120000);
    return () => clearInterval(interval);
  }, [isPaused]);

  // Persist title color for campaigns that don't have one yet (deterministic from id).
  useEffect(() => {
    const toPersist = campaigns.filter((c) => !c.titleColor?.trim() && !titleColorPersistedRef.current.has(c.id));
    if (toPersist.length === 0) return;
    toPersist.forEach((campaign) => {
      titleColorPersistedRef.current.add(campaign.id);
      const color = getCampaignTitleColor(campaign);
      fetch(`/api/campaigns/${campaign.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titleColor: color }),
      })
        .then((res) => res.ok && res.json())
        .then((updated) => {
          if (updated?.titleColor) {
            setCampaigns((prev) =>
              prev.map((c) => (c.id === campaign.id ? { ...c, titleColor: updated.titleColor } : c))
            );
          }
        })
        .catch(() => {
          titleColorPersistedRef.current.delete(campaign.id);
        });
    });
  }, [campaigns]);

  const GMAIL_STATUS_TIMEOUT_MS = 8000;

  async function fetchGmailStatus(signal?: AbortSignal) {
    setGmailLoading(true);
    setGmailError(null);
    try {
      const res = await fetch('/api/auth/gmail/status', { credentials: 'include', signal });
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
    fetch('/api/email-queue/next')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setNextQueueAt(d.nextAt ?? null); setSentToday(d.sentToday ?? 0); setDraftToday(d.draftToday ?? 0); } })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const connected = searchParams.get('gmail_connected');
    const error = searchParams.get('gmail_error');
    if (connected === '1') {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), GMAIL_STATUS_TIMEOUT_MS);
      fetchGmailStatus(ac.signal).finally(() => clearTimeout(t));
      window.history.replaceState({}, '', '/dashboard');
    }
    if (error) {
      const messages: Record<string, string> = {
        save_failed: 'Could not save Gmail tokens. Does the user_profiles table exist? Run the Supabase migration (010_create_user_profiles_gmail.sql).',
        unauthorized: 'Session expired during sign-in. Try again: sign in to PipeShark, then connect Gmail.',
        token_exchange: 'OAuth code exchange failed. Check GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and NEXT_PUBLIC_REDIRECT_URI.',
        config: 'Missing OAuth configuration.',
        invalid_state: 'Invalid OAuth state.',
        missing_params: 'Missing OAuth parameters.',
        timeout: 'Gmail connection timed out. Please try connecting Gmail again.',
        unknown: 'Something went wrong while connecting Gmail. Please try again.',
      };
      setGmailError(messages[error] || `Gmail error: ${error}`);
      window.history.replaceState({}, '', '/dashboard');
    }
  }, [searchParams]);

  /** Normalize to full hour HH:00 (cron only runs at :00). */
  function normalizeToCronHour(time: string | null): string {
    if (!time || !/^\d{1,2}:\d{2}$/.test(time)) return '';
    const [h, m] = time.split(':').map(Number);
    const hour = Math.min(23, Math.max(0, h));
    return `${String(hour).padStart(2, '0')}:00`;
  }

  async function fetchSchedule() {
    try {
      const res = await fetch('/api/schedule');
      if (res.ok) {
        const data = await res.json();
        const raw = data.launchTime || '';
        setScheduleTime(normalizeToCronHour(raw) || '09:00');
        setScheduledCampaignIds(Array.isArray(data.campaignIds) ? data.campaignIds : []);
        setLaunchDeliveryMode(data.launchDeliveryMode === 'drafts' ? 'drafts' : 'queue');
      }
    } catch {
      // Ignore
    }
  }

  useEffect(() => {
    if (!deliveryDropdownOpen) return;
    const close = (e: MouseEvent) => {
      if (deliveryDropdownRef.current && !deliveryDropdownRef.current.contains(e.target as Node)) {
        setDeliveryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [deliveryDropdownOpen]);

  async function saveSchedule(time: string, campaignIds?: string[], deliveryMode?: 'drafts' | 'queue') {
    setScheduleSaving(true);
    try {
      const ids = campaignIds !== undefined ? campaignIds : scheduledCampaignIds;
      const mode = deliveryMode !== undefined ? deliveryMode : launchDeliveryMode;
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          launchTime: time,
          campaignIds: ids,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          launchDeliveryMode: mode,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setScheduleTime(time);
        if (data.campaignIds) setScheduledCampaignIds(data.campaignIds);
        if (data.launchDeliveryMode === 'drafts' || data.launchDeliveryMode === 'queue')
          setLaunchDeliveryMode(data.launchDeliveryMode);
      }
    } catch {
      // Ignore
    } finally {
      setScheduleSaving(false);
    }
  }

  async function fetchRepliesByDay() {
    try {
      const res = await fetch('/api/stats/replies-by-day');
      const data = await (res.ok ? res.json() : []);
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      setRepliesByDay(
        (Array.isArray(data) ? data : []).map(({ date, count, positiveCount }: { date: string; count: number; positiveCount?: number }) => {
          const d = new Date(date + 'T12:00:00');
          return { date, count, positiveCount: positiveCount ?? 0, label: `${dayNames[d.getDay()]} ${d.getDate()}` };
        })
      );
    } catch {
      setRepliesByDay([]);
    }
  }

  async function fetchCampaigns() {
    // Don't fetch if paused
    if (isPaused) {
      return;
    }
    
    try {
      const response = await fetch('/api/campaigns/list');
      const data = await response.json();
      
      if (response.ok && Array.isArray(data)) {
        setCampaigns(data);
        console.log('✅ Fetched campaigns:', data.length);
      } else {
        console.error('❌ Failed to fetch campaigns:', data);
        setCampaigns([]);
      }
    } catch (error) {
      console.error('❌ Error fetching campaigns:', error);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchLeads() {
    // Don't fetch if paused
    if (isPaused) {
      return;
    }

    setLoadingLeads(true);
    try {
      // Run Gmail check-replies in background; when done, refresh leads/stats silently
      fetch('/api/gmail/check-replies', { method: 'POST', credentials: 'include' })
        .then(() =>
          Promise.all([
            fetch(`/api/campaigns?period=${statsPeriodRef.current}`).then((r) => r.ok ? r.json() : null),
            fetch('/api/leads').then((r) => r.ok ? r.json() : null),
          ])
        )
        .then(([statsData, leadsData]) => {
          if (statsData) setStats(statsData);
          if (Array.isArray(leadsData)) setLeads(leadsData);
        })
        .catch(() => {});

      const [statsRes, leadsRes] = await Promise.all([
        fetch(`/api/campaigns?period=${statsPeriodRef.current}`),
        fetch('/api/leads'),
      ]);
      const statsData = await statsRes.json();
      const leadsData = await leadsRes.json();

      if (statsRes.ok) {
        setStats(statsData);
      }

      if (leadsRes.ok && Array.isArray(leadsData)) {
        setLeads(leadsData);
      } else {
        setLeads([]);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
      setLeads([]);
    } finally {
      setLoadingLeads(false);
    }
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
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

  async function handleSaveCampaignName(campaignId: string, newName: string) {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() || null }),
      });
      if (res.ok) {
        const updated = await res.json();
        setCampaigns((prev) =>
          prev.map((c) => (c.id === campaignId ? { ...c, name: updated.name } : c))
        );
        setEditingCampaignId(null);
        setEditingName('');
      }
    } catch {
      // Ignore
    }
  }

  async function handleDeleteCampaign(campaignId: string, campaignName: string) {
    setDeleting(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete campaign');
      }

      setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
      setLeads((prev) => prev.filter((l: Lead) => l.campaignId !== campaignId));
      setDeleteConfirm(null);
      await fetchCampaigns();
      await fetchLeads();
    } catch (error: any) {
      console.error('Error deleting campaign:', error);
      alert(`Error deleting campaign: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  }

  function toggleCampaignSelection(campaignId: string) {
    setSelectedCampaignIds((prev) => {
      const next = new Set(prev);
      if (next.has(campaignId)) next.delete(campaignId);
      else next.add(campaignId);
      return next;
    });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedCampaignIds(new Set());
    setBulkDeleteConfirm(false);
  }

  async function handleBulkDeleteCampaigns() {
    if (selectedCampaignIds.size === 0) return;
    setDeleting(true);
    try {
      const ids = Array.from(selectedCampaignIds);
      const results = await Promise.allSettled(
        ids.map((id) => fetch(`/api/campaigns/${id}`, { method: 'DELETE' }))
      );
      const failed = results.filter((r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok));
      if (failed.length > 0) {
        console.error('Some campaigns failed to delete:', failed);
        alert(`${failed.length} campaign(s) could not be deleted.`);
      }
      await fetchCampaigns();
      exitSelectMode();
    } catch (error: any) {
      console.error('Error bulk deleting campaigns:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-sky-50 dark:bg-black/70 relative">
      <div>
        <Header />
        <div className="w-full px-4 sm:px-6 lg:px-8 py-5">
          {/* Gmail Error Banner */}
          {gmailError && (
            <div className="mb-6 bg-red-900/20 border border-red-700/50 rounded-xl p-4 flex items-start justify-between gap-4">
              <p className="text-sm text-red-200">{gmailError}</p>
              <button
                onClick={() => setGmailError(null)}
                className="text-red-400 hover:text-red-300 text-sm shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Onboarding: Gmail banner only when NOT connected */}
          {!gmailLoading && !gmailConnected && (
            <div className="mb-6">
              <div className="bg-amber-900/20 border border-amber-700/50 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <MailX className="w-5 h-5 text-amber-400" />
                  <div>
                    <p className="font-semibold text-amber-200">Gmail not connected</p>
                    <p className="text-sm text-amber-200/80">
                      Connect your Gmail to receive generated email drafts in your inbox
                    </p>
                  </div>
                </div>
                <Link
                  href="/preferences"
                  className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl font-semibold transition-colors"
                >
                  <MailCheck className="w-4 h-4" />
                  Connect Gmail
                </Link>
              </div>
            </div>
          )}

          {/* Header Section: My Campaigns | Leads & Replies | Credits */}
          <div className="flex flex-wrap items-start gap-4 mb-1">
            {/* Dashboard — titre + Today's Timeline empilés */}
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-zinc-500 dark:text-zinc-400 flex-shrink-0" fill="currentColor">
                  <rect x="1" y="1" width="9" height="9" rx="2.5" />
                  <rect x="13" y="1" width="9" height="9" rx="2.5" />
                  <rect x="1" y="13" width="9" height="9" rx="2.5" />
                  <rect x="13" y="13" width="9" height="9" rx="2.5" />
                </svg>
                <h1 className="text-base font-display font-bold text-zinc-500 dark:text-zinc-400">
                  Dashboard
                </h1>
              </div>
              {/* Today's timeline — juste en dessous du titre */}
              <div className="inline-flex">
              <div className="rounded-xl bg-white dark:bg-neutral-800/80 shadow-none border border-zinc-200 dark:border-sky-700/50 px-3 py-2.5 xl:max-2xl:px-2 xl:max-2xl:py-1.5">
                <div className="flex flex-col gap-1 items-center">
                  <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">Today's timeline</span>
                  <div className="flex items-center">
                    {/* Box 1: new leads */}
                    <div className="relative rounded-xl bg-zinc-100 dark:bg-neutral-700/50 shadow-sm px-3 py-2 xl:max-2xl:px-2 xl:max-2xl:py-1 text-sm shrink-0">
                      {todayLeads.length > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                        </span>
                      )}
                      <div className="font-semibold text-zinc-700 dark:text-zinc-200 xl:max-2xl:text-xs">{todayLeads.length} new leads</div>
                      {todayCampaignName && <div className="text-xs xl:max-2xl:text-[10px] text-zinc-400 dark:text-zinc-500 truncate max-w-[110px] xl:max-2xl:max-w-[80px]">from {todayCampaignName}</div>}
                    </div>
                    {/* Connector */}
                    <div className="flex items-center w-14 xl:max-2xl:w-8 shrink-0">
                      <div className="w-full h-px bg-zinc-300 dark:bg-neutral-600" />
                    </div>
                    {/* Box 2: emails sent */}
                    <div className="relative rounded-xl bg-zinc-100 dark:bg-neutral-700/50 shadow-sm px-3 py-2 xl:max-2xl:px-2 xl:max-2xl:py-1 text-sm shrink-0">
                      {(sentToday + draftToday) > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                        </span>
                      )}
                      <div className="font-semibold text-zinc-700 dark:text-zinc-200 xl:max-2xl:text-xs">
                        {sentToday > 0 && <span>{sentToday} sent</span>}
                        {sentToday > 0 && draftToday > 0 && <span className="text-zinc-300 mx-1">·</span>}
                        {draftToday > 0 && <span>{draftToday} draft{draftToday > 1 ? 's' : ''}</span>}
                        {sentToday === 0 && draftToday === 0 && <span>0 emails</span>}
                      </div>
                      <div className="text-xs xl:max-2xl:text-[10px] text-zinc-400 dark:text-zinc-500">sent today</div>
                      {(sentToday + draftToday) === 0 && nextQueueAt && (
                        <div className="text-[9px] text-zinc-400 dark:text-zinc-500 whitespace-nowrap mt-0.5">
                          next at {new Date(nextQueueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                    {/* Connector */}
                    <div className="w-14 xl:max-2xl:w-8 shrink-0 h-px bg-zinc-300 dark:bg-neutral-600" />
                    {/* Box 3: replies today */}
                    <Link href="/messages#replies" className="relative rounded-xl bg-zinc-100 dark:bg-neutral-700/50 shadow-sm px-3 py-2 xl:max-2xl:px-2 xl:max-2xl:py-1 text-sm shrink-0 hover:bg-zinc-200 dark:hover:bg-neutral-600/60 transition-colors">
                      {repliesToday > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                        </span>
                      )}
                      <div className="font-semibold text-zinc-700 dark:text-zinc-200 xl:max-2xl:text-xs">{repliesToday} {repliesToday === 1 ? 'reply' : 'replies'}</div>
                      <div className="text-xs xl:max-2xl:text-[10px] text-zinc-400 dark:text-zinc-500">today</div>
                    </Link>
                  </div>
                </div>
              </div>
              </div>
            </div>
            {/* StatsCards (5 cards) + period selector + Daily Credits */}
            <div className="flex items-start gap-3 flex-shrink-0">
              <div className="-translate-x-12 flex items-stretch gap-0">
                <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-zinc-200 dark:border-sky-700/30 shadow-sm px-3 py-3">
                  <StatsCards stats={stats} mini />
                </div>
                <div className="flex flex-col justify-center gap-0.5 pl-1.5">
                  {(['week', 'month', 'all'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setStatsPeriod(p)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors ${
                        statsPeriod === p
                          ? 'bg-sky-500 text-white'
                          : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                      }`}
                    >
                      {p === 'week' ? '7d' : p === 'month' ? '30d' : 'All'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="w-44 flex-shrink-0">
                <CreditsGauge />
              </div>
            </div>
          </div>

          {/* Daily Launch + Replies this week side by side */}
          <div className="flex items-start gap-3 mb-8 mt-6">
          <div className="flex flex-col items-start gap-1.5 flex-1 min-w-0">
            <div className={`transition-all duration-300 ${sidebarOpen ? 'w-full max-w-full origin-left scale-[1.08]' : ''}`}>
            <div className={`rounded-xl bg-white dark:bg-neutral-800/50 shadow-sm border border-zinc-200 dark:border-sky-700/50 inline-flex items-center ${sidebarOpen ? 'flex-nowrap overflow-x-auto max-w-full gap-1.5 p-2' : 'flex-wrap p-3 gap-2'}`}>
              <Clock className={`text-sky-500 dark:text-sky-400 flex-shrink-0 ${sidebarOpen ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
              <span className={`font-medium text-zinc-700 dark:text-neutral-200 ${sidebarOpen ? 'text-xs whitespace-nowrap' : 'text-sm'}`}>Daily Launch</span>
              <span className={`text-zinc-400 dark:text-zinc-500 font-normal whitespace-nowrap ${sidebarOpen ? 'text-[11px]' : 'text-xs'}`}>— finds new leads at</span>
              <div className="relative">
                <select
                  id="schedule-time"
                  value={scheduleTime}
                  onChange={(e) => {
                    const t = e.target.value;
                    setScheduleTime(t);
                    saveSchedule(t, scheduledCampaignIds);
                  }}
                  className={`appearance-none pl-2 pr-6 rounded-lg border border-zinc-200 dark:border-sky-700/40 bg-white dark:bg-neutral-800 font-semibold text-zinc-700 dark:text-sky-200 shadow-sm hover:border-sky-400 dark:hover:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400/30 transition-colors cursor-pointer ${sidebarOpen ? 'py-1 text-xs' : 'pl-3 pr-7 py-1.5 text-sm'}`}
                  title="Launch at the chosen time (your timezone)."
                >
                  {Array.from({ length: 24 }, (_, i) => {
                    const h = String(i).padStart(2, '0');
                    return (
                      <option key={h} value={`${h}:00`}>
                        {h}:00
                      </option>
                    );
                  })}
                </select>
                <ChevronDown className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-zinc-400 dark:text-sky-500 ${sidebarOpen ? 'right-1 w-3 h-3' : 'right-1.5 w-3.5 h-3.5'}`} />
              </div>
              <span className={`text-zinc-500 dark:text-neutral-400 whitespace-nowrap ${sidebarOpen ? 'text-[11px]' : 'text-sm'}`}>every day with</span>
              <span className="text-zinc-300 dark:text-zinc-600 mx-0.5 shrink-0">|</span>
              {campaigns.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setScheduleModalSelectedIds([...scheduledCampaignIds]);
                    setShowScheduleCampaignsModal(true);
                  }}
                  className={`inline-flex flex-col items-start rounded-lg transition-colors ${sidebarOpen ? 'ml-0 px-2 py-1' : 'ml-1 px-3 py-1.5'} ${
                    scheduledCampaignIds.length === 0
                      ? 'bg-zinc-100 dark:bg-neutral-700/50 text-zinc-600 dark:text-sky-300 border border-zinc-200 dark:border-sky-700/50 hover:bg-zinc-200 dark:hover:bg-neutral-700'
                      : 'bg-sky-500 text-white hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-500'
                  }`}
                  title="Choose which campaigns run at Daily Launch time"
                >
                  <span className={`inline-flex items-center gap-1.5 whitespace-nowrap ${sidebarOpen ? 'gap-1' : ''}`}>
                    <CheckSquare className={`shrink-0 opacity-80 ${sidebarOpen ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
                    {scheduledCampaignIds.length === 0 ? (
                      <span className={sidebarOpen ? 'text-xs font-medium' : 'text-sm font-medium'}>Choose campaigns</span>
                    ) : (
                      <span className={sidebarOpen ? 'text-xs font-semibold' : 'text-sm font-semibold'}>{scheduledCampaignIds.map(id => campaigns.find(c => c.id === id)?.name || campaigns.find(c => c.id === id)?.businessType || id).join(', ')}</span>
                    )}
                  </span>
                </button>
              )}
              {scheduleSaving && (
                <span className="text-xs text-zinc-400 dark:text-neutral-500">Saving…</span>
              )}
              <span className="text-zinc-300 dark:text-zinc-600 mx-0.5 shrink-0">|</span>
              {/* Add to send queue automatically — encadrement */}
              <div className={`inline-flex items-center border border-zinc-200 dark:border-sky-700/50 rounded-2xl bg-white dark:bg-neutral-800/60 shadow-sm ${sidebarOpen ? 'gap-1 px-1.5 py-1' : 'gap-2 px-2 py-1.5'}`}>
                <div className="flex flex-row gap-0.5 rounded-lg bg-zinc-100 dark:bg-neutral-700/60 p-0.5 text-[10px] font-semibold">
                  <button
                    type="button"
                    onClick={() => { setAutoEnqueueEnabled(true); localStorage.setItem('pipeshark-auto-enqueue', 'true'); }}
                    className={`px-2 py-0.5 rounded-md transition-all ${autoEnqueueEnabled ? 'bg-emerald-500 text-white shadow-sm cursor-default' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer'}`}
                  >On</button>
                  <button
                    type="button"
                    onClick={() => { setAutoEnqueueEnabled(false); localStorage.setItem('pipeshark-auto-enqueue', 'false'); }}
                    className={`px-2 py-0.5 rounded-md transition-all ${!autoEnqueueEnabled ? 'bg-zinc-400 text-white shadow-sm cursor-default' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer'}`}
                  >Off</button>
                </div>
                <span className={`font-medium text-zinc-700 dark:text-neutral-200 whitespace-nowrap ${!autoEnqueueEnabled ? 'opacity-50' : ''} ${sidebarOpen ? 'text-[11px]' : 'text-sm'}`}>
                  Add to send queue automatically
                </span>
                <div className={`inline-flex items-center gap-0.5 rounded-full bg-zinc-100 dark:bg-neutral-700/60 p-0.5 font-semibold ${!autoEnqueueEnabled ? 'pointer-events-none opacity-50' : ''} ${sidebarOpen ? 'text-[10px]' : 'text-xs'}`}>
                  <button
                    type="button"
                    onClick={() => { if (autoEnqueueEnabled) { setLaunchDeliveryMode('queue'); saveSchedule(scheduleTime, undefined, 'queue'); } }}
                    className={`rounded-full transition-all ${launchDeliveryMode === 'queue' ? 'bg-emerald-500 text-white shadow-sm cursor-default' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer'} ${sidebarOpen ? 'px-2 py-0.5' : 'px-3 py-1'}`}
                  >Send</button>
                  <button
                    type="button"
                    onClick={() => { if (autoEnqueueEnabled) { setLaunchDeliveryMode('drafts'); saveSchedule(scheduleTime, undefined, 'drafts'); } }}
                    className={`rounded-full transition-all ${launchDeliveryMode === 'drafts' ? 'bg-amber-600 text-white shadow-sm cursor-default' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer'} ${sidebarOpen ? 'px-2 py-0.5' : 'px-3 py-1'}`}
                  >Draft</button>
                </div>
              </div>
              {enqueueFeedback && (
                <span className={`text-xs ${enqueueFeedback.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {enqueueFeedback.text}
                </span>
              )}
            </div>
            </div>
          </div>
          {/* Replies this week - remontée, détachée de My Campaigns */}
          <div className="w-56 flex-shrink-0 -mt-14">
            <div className="rounded-2xl bg-white/80 dark:bg-neutral-800/60 shadow-sm p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-zinc-600 dark:text-neutral-300">Replies this week</p>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-[10px] text-zinc-400 dark:text-neutral-500"><span className="inline-block w-2 h-2 rounded-sm bg-sky-400"></span>All</span>
                  <span className="flex items-center gap-1 text-[10px] text-zinc-400 dark:text-neutral-500"><span className="inline-block w-2 h-2 rounded-sm bg-green-400"></span>Positive</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={80}>
                <BarChart data={repliesByDay} margin={{ top: 2, right: 4, left: 0, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 8, fill: 'var(--foreground)', opacity: 0.8 }} tickLine={false} axisLine={false} interval={0} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 8, fill: 'var(--foreground)', opacity: 0.7 }} tickLine={false} axisLine={false} width={14} />
                  <Tooltip contentStyle={{ borderRadius: 6, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} formatter={(value: number | undefined, name: string | undefined) => [value ?? 0, name === 'count' ? 'All replies' : 'Positive']} labelFormatter={(label) => label} />
                  <Bar dataKey="count" fill="rgb(14 165 233)" radius={[3, 3, 0, 0]} maxBarSize={12} />
                  <Bar dataKey="positiveCount" fill="rgb(74 222 128)" radius={[3, 3, 0, 0]} maxBarSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          </div>

          {/* Section My Campaigns — remontée, détachée de Replies */}
          <div className="rounded-2xl bg-white dark:bg-neutral-800/60 shadow-md overflow-hidden mb-6 -mt-4">
            <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-neutral-700 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Zap className="w-5 h-5 text-sky-400 dark:text-sky-300 flex-shrink-0 fill-sky-400 dark:fill-sky-300" />
                <h2 className="text-lg font-display font-bold text-zinc-900 dark:text-white shrink-0">My Campaigns</h2>
                {scheduledCampaignIds.length > 0 && (
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate" title={scheduledCampaignIds.map(id => campaigns.find(c => c.id === id)?.name || campaigns.find(c => c.id === id)?.businessType || id).join(', ')}>
                    <span className="text-zinc-400 dark:text-zinc-500">— selected for Daily Launch:</span>{' '}
                    {scheduledCampaignIds.map(id => campaigns.find(c => c.id === id)?.name || campaigns.find(c => c.id === id)?.businessType || id).join(', ')}
                  </span>
                )}
              </div>
              {!loading && campaigns.length > 0 && (
                <div className="flex items-center gap-2">
                  {!selectMode ? (
                    <>
                      <Link
                        href="/campaigns/new"
                        className="inline-flex items-center gap-1.5 bg-sky-400 hover:bg-sky-300 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
                        title="Create a new prospection campaign"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        New Campaign
                      </Link>
                      <button
                        onClick={() => setSelectMode(true)}
                        className="px-2 py-1 text-xs bg-sky-100 dark:bg-[#051a28] text-zinc-800 dark:text-white rounded-lg hover:opacity-90 transition-opacity"
                        title="Select campaigns to delete in bulk"
                      >
                        Select
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={exitSelectMode}
                        className="px-2 py-1 text-xs bg-sky-100 dark:bg-[#051a28] text-zinc-800 dark:text-white rounded-lg hover:opacity-90 transition-opacity"
                        title="Cancel selection"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => setBulkDeleteConfirm(true)}
                        disabled={selectedCampaignIds.size === 0}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-600/80 border border-red-500/50 rounded-lg text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Delete selected campaigns"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete ({selectedCampaignIds.size})
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="p-4 sm:p-5 pt-0">
          {/* Campaigns List */}
          {loading ? (
            <div className="bg-zinc-100 dark:bg-neutral-800/80 rounded-xl border border-zinc-200 dark:border-neutral-700 shadow-xl p-12 text-center mb-8">
              <p className="text-zinc-500 dark:text-neutral-400">Loading campaigns...</p>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="bg-zinc-100 dark:bg-neutral-800/80 rounded-xl border border-zinc-200 dark:border-neutral-700 shadow-xl p-12 text-center mb-8">
              <p className="text-zinc-500 dark:text-neutral-400 mb-4">No campaigns yet</p>
              <Link
                href="/campaigns/new"
                className="inline-flex items-center gap-2 bg-sky-400 hover:bg-sky-300 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200"
                title="Create your first prospection campaign"
              >
                <Plus className="w-5 h-5" />
                Create your first campaign
              </Link>
            </div>
          ) : (
            <div className="mb-1">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {displayedCampaigns.map((campaign) => {
                const cardClass = 'bg-white dark:bg-neutral-800/80 border border-sky-200 dark:border-sky-700/50';
                // Helper function to format city size display
                const formatCitySize = (citySize?: string): string => {
                  // Default to '1M+' if no citySize is set (for old campaigns)
                  const effectiveCitySize = citySize || '1M+';
                  const sizeMap: { [key: string]: string } = {
                    '1M+': '> 1M',
                    '500K-1M': '500K-1M',
                    '500K+': '> 500K',
                    '250K-500K': '250K-500K',
                    '250K+': '> 250K',
                    '100K-250K': '100K-250K',
                    '100K+': '> 100K',
                    '50K-100K': '50K-100K',
                    'all': 'All'
                  };
                  return `Any City ${sizeMap[effectiveCitySize] || effectiveCitySize}`;
                };

                // Leads that belong to this campaign (inserted with this campaign_id)
                const campaignLeads = leads.filter(
                  (lead: Lead) => lead.campaignId === campaign.id
                );
                // Fallback: leads without campaign_id matched by businessType + cities + createdAfter
                const campaignCreatedAt = new Date(campaign.createdAt).getTime();
                const fallbackLeads = leads.filter((lead: Lead) => {
                  if (lead.campaignId != null) return false;
                  const matchesBusinessType =
                    lead.businessType?.toLowerCase() === campaign.businessType.toLowerCase();
                  const matchesCity =
                    !campaign.cities ||
                    campaign.cities.length === 0 ||
                    (lead.city &&
                      campaign.cities.some(
                        (city) => lead.city?.toLowerCase() === city.toLowerCase()
                      ));
                  const leadCreatedAt = lead.date ? new Date(lead.date).getTime() : 0;
                  const createdAfterCampaign = leadCreatedAt >= campaignCreatedAt;
                  return matchesBusinessType && matchesCity && createdAfterCampaign;
                });
                let allCampaignLeads = campaignLeads.length > 0 ? campaignLeads : fallbackLeads;
                // When campaign has specific cities (e.g. Toronto), show only leads from those cities (n8n may return other cities)
                if (campaign.cities && campaign.cities.length > 0) {
                  const citySet = new Set(campaign.cities.map((c: string) => c.trim().toLowerCase()));
                  allCampaignLeads = allCampaignLeads.filter(
                    (lead: Lead) => lead.city?.trim() && citySet.has(lead.city.trim().toLowerCase())
                  );
                }
                const leadsCount = allCampaignLeads.length;
                const draftsCount = allCampaignLeads.filter(
                  (lead: Lead) => lead.emailDraftCreated
                ).length;

                const isSelected = selectedCampaignIds.has(campaign.id);

                return (
                  <div
                    key={campaign.id}
                    className={`rounded-xl shadow-lg p-4 hover:shadow-xl transition-all duration-200 group relative overflow-hidden ${cardClass} ${selectMode && isSelected ? 'ring-2 ring-sky-500' : ''}`}
                    onClick={
                      selectMode
                        ? (e) => {
                            e.preventDefault();
                            toggleCampaignSelection(campaign.id);
                          }
                        : editingCampaignId === campaign.id
                          ? (e) => e.stopPropagation()
                          : undefined
                    }
                  >
                    <Link
                      href={editingCampaignId === campaign.id || selectMode ? '#' : `/campaigns/${campaign.id}`}
                      className="block relative z-10"
                      onClick={(e) => {
                        if (selectMode || editingCampaignId === campaign.id) e.preventDefault();
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            {selectMode && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toggleCampaignSelection(campaign.id);
                                }}
                                className="shrink-0 p-0.5 text-sky-500 hover:text-sky-400"
                                title={isSelected ? 'Deselect this campaign' : 'Select this campaign'}
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-5 h-5" />
                                ) : (
                                  <Square className="w-5 h-5" />
                                )}
                              </button>
                            )}
                            {!selectMode && editingCampaignId === campaign.id ? (
                              <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onBlur={() => handleSaveCampaignName(campaign.id, editingName)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSaveCampaignName(campaign.id, editingName);
                                  } else if (e.key === 'Escape') {
                                    setEditingCampaignId(null);
                                    setEditingName('');
                                  }
                                }}
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                autoFocus
                                className="flex-1 min-w-0 text-lg font-display font-bold text-zinc-900 dark:text-white rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-sky-400 bg-sky-100/80 dark:bg-sky-950/80"
                              />
                            ) : (
                              <>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h3 className="text-base font-display font-bold text-zinc-900 dark:text-white group-hover:opacity-80 transition-opacity truncate min-w-0">
                                      {campaign.name?.trim() || campaign.businessType.charAt(0).toUpperCase() + campaign.businessType.slice(1)}
                                    </h3>
                                    {scheduledCampaignIds.includes(campaign.id) && (
                                      <span className="inline-flex items-center gap-1.5 shrink-0 text-xs font-bold text-white bg-sky-500 dark:bg-sky-600/90 border border-sky-600 dark:border-sky-500 rounded-lg px-2 py-1 shadow-sm ml-auto">
                                        <Clock className="w-3.5 h-3.5 shrink-0" />
                                        Daily Launch
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-zinc-500 dark:text-sky-400/90 capitalize mt-0.5">
                                    {campaign.businessType}
                                  </p>
                                </div>
                                {!selectMode && (
                                  <div className="relative shrink-0">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setOpenMenuCampaignId((prev) => (prev === campaign.id ? null : campaign.id));
                                      }}
                                      className="p-1.5 text-zinc-500 dark:text-neutral-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                                      title="Options"
                                    >
                                      <MoreVertical className="w-4 h-4" />
                                    </button>
                                    {openMenuCampaignId === campaign.id && (
                                      <>
                                        <div
                                          className="fixed inset-0 z-40"
                                          aria-hidden
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setOpenMenuCampaignId(null);
                                          }}
                                        />
                                        <div className="absolute right-0 top-full mt-1 z-50 min-w-[140px] py-1 bg-neutral-800 border border-neutral-600 rounded-lg shadow-xl">
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              setEditingCampaignId(campaign.id);
                                              setEditingName(campaign.name?.trim() || campaign.businessType.charAt(0).toUpperCase() + campaign.businessType.slice(1));
                                              setOpenMenuCampaignId(null);
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-neutral-200 hover:bg-neutral-700 hover:text-white transition-colors"
                                            title="Edit campaign name"
                                          >
                                            <Pencil className="w-4 h-4 shrink-0" />
                                            Edit name
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              setDeleteConfirm({
                                                campaignId: campaign.id,
                                                campaignName: campaign.name?.trim() || campaign.businessType.charAt(0).toUpperCase() + campaign.businessType.slice(1)
                                              });
                                              setOpenMenuCampaignId(null);
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-red-600 dark:text-red-300 hover:bg-zinc-100 dark:hover:bg-neutral-700 hover:text-red-700 dark:hover:text-red-200 transition-colors"
                                            title="Delete this campaign"
                                          >
                                            <Trash2 className="w-4 h-4 shrink-0" />
                                            Delete
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                          {campaign.cities && campaign.cities.length > 0 ? (
                            <div className="flex items-center gap-1 text-sm min-w-0">
                              <MapPin className="w-4 h-4 flex-shrink-0 text-sky-400 dark:text-sky-300" />
                              <span className="truncate text-zinc-500 dark:text-zinc-400" title={campaign.cities.map((c) => (campaign.countryByCity?.[c] ? `${c}, ${campaign.countryByCity[c]}` : c)).join(', ')}>
                                {campaign.cities.map((c) => (campaign.countryByCity?.[c] ? `${c}, ${campaign.countryByCity[c]}` : c)).join(', ')}
                              </span>
                            </div>
                          ) : (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              {formatCitySize(campaign.citySize)}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-sky-400 dark:text-sky-300" />
                        <span className="text-zinc-500 dark:text-zinc-400" title={campaign.lastLeadAt ? 'Last leads update' : 'Created'}>
                          {formatDate(campaign.lastLeadAt ?? campaign.createdAt)}
                        </span>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-white/10">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white dark:bg-white/15 border border-zinc-200 dark:border-white/20 text-xs font-semibold text-zinc-700 dark:text-zinc-300 shadow-sm">
                            <Image src="/customer.png" alt="" width={12} height={12} className="w-3 h-3 object-contain [filter:brightness(0)_saturate(100%)_invert(68%)_sepia(60%)_saturate(1200%)_hue-rotate(180deg)] dark:[filter:brightness(0)_invert(1)] opacity-90" />
                            {leadsCount} lead{leadsCount !== 1 ? 's' : ''}
                          </span>
                          <div className="flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
                            <span className="font-medium text-zinc-700 dark:text-zinc-300">{campaign.numberCreditsUsed ?? 0}</span>
                            <Image src="/star-inside-circle.png" alt="" width={14} height={14} className="w-3.5 h-3.5 object-contain [filter:invert(1)_sepia(1)_saturate(10000%)_hue-rotate(-45deg)]" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })}
              </div>
              {campaigns.length > 4 && (
                <div className="mt-3 text-center">
                  <button
                    onClick={() => setShowAllCampaigns((prev) => !prev)}
                    className="text-sm text-sky-500 hover:text-sky-400 font-medium transition-colors"
                    title={showAllCampaigns ? 'Show fewer campaigns' : 'Show all campaigns'}
                  >
                    {showAllCampaigns
                      ? 'Show less'
                      : `Show all campaigns (${campaigns.length - 4} more)`}
                  </button>
                </div>
              )}
            </div>
          )}

            </div>
          </div>

          {/* Delete Confirmation Modal */}
          {deleteConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-white dark:bg-neutral-900 rounded-xl border border-zinc-200 dark:border-neutral-700 shadow-2xl p-6 max-w-md w-full mx-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-zinc-900 dark:text-white">
                    Delete Campaign
                  </h3>
                </div>
                
                <p className="text-zinc-600 dark:text-neutral-300 mb-6">
                  Are you sure you want to delete the campaign <span className="font-semibold text-zinc-900 dark:text-white">"{deleteConfirm.campaignName}"</span>? This action cannot be undone.
                </p>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    disabled={deleting}
                    className="flex-1 px-4 py-2 bg-zinc-200 dark:bg-neutral-700 hover:bg-zinc-300 dark:hover:bg-neutral-600 text-zinc-900 dark:text-white rounded-xl font-semibold transition-colors disabled:opacity-50"
                    title="Cancel and keep the campaign"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeleteCampaign(deleteConfirm.campaignId, deleteConfirm.campaignName)}
                    disabled={deleting}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    title="Permanently delete this campaign and its leads"
                  >
                    {deleting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Deleting…
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bulk Delete Confirmation Modal */}
          {bulkDeleteConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-white dark:bg-neutral-900 rounded-xl border border-zinc-200 dark:border-neutral-700 shadow-2xl p-6 max-w-md w-full mx-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-zinc-900 dark:text-white">
                    Delete campaigns
                  </h3>
                </div>
                
                <p className="text-zinc-600 dark:text-neutral-300 mb-6">
                  Are you sure you want to delete <span className="font-semibold text-zinc-900 dark:text-white">{selectedCampaignIds.size} campaign(s)</span>? This action cannot be undone.
                </p>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setBulkDeleteConfirm(false)}
                    disabled={deleting}
                    className="flex-1 px-4 py-2 bg-zinc-200 dark:bg-neutral-700 hover:bg-zinc-300 dark:hover:bg-neutral-600 text-zinc-900 dark:text-white rounded-xl font-semibold transition-colors disabled:opacity-50"
                    title="Cancel and keep the selected campaigns"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkDeleteCampaigns}
                    disabled={deleting}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    title="Permanently delete all selected campaigns"
                  >
                    {deleting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Deleting…
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Schedule campaigns modal */}
          {showScheduleCampaignsModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-white dark:bg-neutral-900 rounded-xl border border-zinc-200 dark:border-neutral-700 shadow-2xl p-6 max-w-md w-full mx-4 max-h-[80vh] flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-sky-100 dark:bg-sky-900/20 rounded-lg">
                    <Clock className="w-6 h-6 text-sky-600 dark:text-sky-400" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-zinc-900 dark:text-white">
                    Scheduled launch campaigns
                  </h3>
                </div>
                <p className="text-zinc-600 dark:text-neutral-300 text-sm mb-3">
                  Choose the campaigns that will launch at the set time (max {dailyLimit} credits/day). They will run one after the other, even when you&apos;re not on the site.
                </p>
                <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-1">
                  {campaigns.map((c) => {
                    const checked = scheduleModalSelectedIds.includes(c.id);
                    const credits = c.numberCreditsUsed ?? 0;
                    return (
                      <label
                        key={c.id}
                        className="flex items-center gap-3 p-2 rounded-lg bg-zinc-100 dark:bg-neutral-800/50 hover:bg-zinc-200 dark:hover:bg-neutral-800 border border-transparent hover:border-zinc-300 dark:hover:border-neutral-600 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setScheduleModalSelectedIds((prev) =>
                              prev.includes(c.id)
                                ? prev.filter((id) => id !== c.id)
                                : [...prev, c.id]
                            );
                          }}
                          className="rounded border-zinc-400 dark:border-neutral-500 text-sky-500 focus:ring-sky-500"
                        />
                        <span className="flex-1 text-zinc-900 dark:text-white font-medium truncate">
                          {c.name || c.businessType}
                        </span>
                        <span className="text-xs text-zinc-500 dark:text-neutral-400 shrink-0">{credits} cr.</span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-zinc-500 dark:text-neutral-400 mb-4">
                  Total: {campaigns.filter((c) => scheduleModalSelectedIds.includes(c.id)).reduce((acc, c) => acc + (c.numberCreditsUsed ?? 0), 0)} credits / {dailyLimit} max
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowScheduleCampaignsModal(false)}
                    className="flex-1 px-4 py-2 bg-zinc-200 dark:bg-neutral-700 hover:bg-zinc-300 dark:hover:bg-neutral-600 text-zinc-900 dark:text-white rounded-xl font-semibold transition-colors"
                    title="Close without saving"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await saveSchedule(scheduleTime || '09:00', scheduleModalSelectedIds);
                      setScheduledCampaignIds(scheduleModalSelectedIds);
                      setShowScheduleCampaignsModal(false);
                    }}
                    disabled={scheduleSaving}
                    className="flex-1 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-semibold transition-colors disabled:opacity-50"
                    title="Save selected campaigns for Daily Launch"
                  >
                    {scheduleSaving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* All my leads Section — carte sans bandeau titre (titre + Refresh + Trash dans LeadsTable) */}
          <div id="all-my-leads" ref={leadsSectionRef} className="rounded-2xl bg-white dark:bg-neutral-800/60 shadow-md border border-zinc-200 dark:border-neutral-700 overflow-hidden mt-6">
            <div className="p-4 sm:p-5 pt-0">
            <LeadsTable
              leads={displayedLeads}
              loading={loadingLeads}
              filterBusinessType={filterBusinessType}
              filterCity={filterCity}
              filterView={filterView}
              campaignIdToTone={Object.fromEntries(campaigns.map((c) => [c.id, c.toneOfVoice || 'professional']))}
              campaignIdToName={Object.fromEntries(campaigns.map((c) => [c.id, c.name || c.businessType || 'Campaign']))}
              campaigns={campaigns.map((c) => ({ id: c.id, name: c.name || c.businessType || c.id }))}
              selectedCampaignId={leadsCampaignFilterId}
              onCampaignFilterChange={setLeadsCampaignFilterId}
              onDraftModalOpenChange={(open) => { draftModalOpenRef.current = open; }}
              onFilterBusinessTypeChange={setFilterBusinessType}
              onFilterCityChange={setFilterCity}
              onFilterViewChange={setFilterView}
              onRefresh={fetchLeads}
              onTrash={async (leadIds) => {
                await fetch('/api/leads/trash', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ leadIds, action: 'trash' }),
                });
                fetchLeads();
              }}
              onEnqueue={async (leadIds, deliveryType) => {
                setLeadsEnqueueFeedback(null);
                try {
                  const res = await fetch('/api/leads/enqueue', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ leadIds, deliveryType }),
                    credentials: 'include',
                  });
                  const data = await res.json().catch(() => ({}));
                  if (res.ok) {
                    setLeadsEnqueueFeedback({
                      type: 'success',
                      text: data.enqueued === 0
                        ? (data.message || 'Already in queue.')
                        : `${data.enqueued} lead${data.enqueued !== 1 ? 's' : ''} added to queue.`,
                    });
                    fetchLeads();
                    setTimeout(() => setLeadsEnqueueFeedback(null), 5000);
                  } else {
                    setLeadsEnqueueFeedback({ type: 'error', text: data.error || 'Failed to enqueue.' });
                  }
                } catch {
                  setLeadsEnqueueFeedback({ type: 'error', text: 'Failed to enqueue.' });
                }
              }}
              onUpdateDeliveryType={async (queueItemId, deliveryType) => {
                // Optimistic update
                setLeads((prev) => prev.map((l) => l.queueItemId === queueItemId ? { ...l, deliveryType } : l));
                try {
                  const res = await fetch('/api/leads/queue-delivery-type', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ queueItemId, deliveryType }),
                    credentials: 'include',
                  });
                  if (!res.ok) {
                    // Revert on failure
                    fetchLeads();
                  }
                } catch {
                  fetchLeads();
                }
              }}
            />
            {leadsEnqueueFeedback && (
              <div className={`mt-2 px-4 py-2 rounded-xl text-sm font-medium ${
                leadsEnqueueFeedback.type === 'success'
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
              }`}>
                {leadsEnqueueFeedback.text}
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
