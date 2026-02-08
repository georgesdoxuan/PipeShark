'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import Header from '@/components/Header';
import LeadsTable from '@/components/LeadsTable';
import StatsCards from '@/components/StatsCards';
import CreditsGauge from '@/components/CreditsGauge';
import { useApiPause } from '@/contexts/ApiPauseContext';
import Image from 'next/image';
import { Plus, Calendar, MapPin, Trash2, X, AlertTriangle, Send, Mail, Clock, Pencil, MailCheck, MailX, ListTodo, CheckSquare, Square, MoreVertical } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface Campaign {
  id: string;
  name?: string;
  businessType: string;
  cities?: string[];
  citySize?: string;
  numberCreditsUsed?: number;
  createdAt: string;
  status: 'active' | 'completed';
}

interface Lead {
  id: string;
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
  });
  const [loading, setLoading] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [syncRepliesLoading, setSyncRepliesLoading] = useState(false);
  const [filterBusinessType, setFilterBusinessType] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterReplied, setFilterReplied] = useState<'all' | 'replied' | 'pending'>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<{ campaignId: string; campaignName: string } | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [showAllCampaigns, setShowAllCampaigns] = useState(false);
  const [scheduleTime, setScheduleTime] = useState<string>('');
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [openMenuCampaignId, setOpenMenuCampaignId] = useState<string | null>(null);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);
  const [gmailLoading, setGmailLoading] = useState(true);
  const [gmailError, setGmailError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const draftModalOpenRef = useRef(false);

  const { isPaused } = useApiPause();

  const displayedCampaigns = useMemo(() => {
    const sorted = [...campaigns].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return showAllCampaigns ? sorted : sorted.slice(0, 4);
  }, [campaigns, showAllCampaigns]);

  useEffect(() => {
    // Only fetch if not paused
    if (!isPaused) {
      fetchCampaigns();
      fetchLeads();
      fetchSchedule();
    }
    
    // Refresh every 60s (only if not paused and draft modal is closed)
    const interval = setInterval(() => {
      if (!isPaused && !draftModalOpenRef.current) {
        fetchCampaigns();
        fetchLeads();
        fetchSchedule();
      }
    }, 60000);
    
    return () => clearInterval(interval);
  }, [isPaused]);

  async function fetchGmailStatus() {
    setGmailLoading(true);
    setGmailError(null);
    try {
      const res = await fetch('/api/auth/gmail/status', { credentials: 'include' });
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
  }, []);

  useEffect(() => {
    const connected = searchParams.get('gmail_connected');
    const error = searchParams.get('gmail_error');
    if (connected === '1') {
      fetchGmailStatus();
      window.history.replaceState({}, '', '/dashboard');
    }
    if (error) {
      const messages: Record<string, string> = {
        save_failed: 'Impossible de sauvegarder les tokens Gmail. La table user_profiles existe-t-elle ? Exécutez la migration Supabase (010_create_user_profiles_gmail.sql).',
        unauthorized: 'Session expirée pendant la connexion. Réessayez en vous connectant à PipeShark.',
        token_exchange: 'Échec de l\'échange du code OAuth. Vérifiez GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET et NEXT_PUBLIC_REDIRECT_URI.',
        config: 'Configuration OAuth manquante.',
        invalid_state: 'État OAuth invalide.',
        missing_params: 'Paramètres OAuth manquants.',
      };
      setGmailError(messages[error] || `Erreur Gmail: ${error}`);
      window.history.replaceState({}, '', '/dashboard');
    }
  }, [searchParams]);

  async function fetchSchedule() {
    try {
      const res = await fetch('/api/schedule');
      if (res.ok) {
        const data = await res.json();
        setScheduleTime(data.launchTime || '');
      }
    } catch {
      // Ignore
    }
  }

  async function saveSchedule(time: string) {
    setScheduleSaving(true);
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ launchTime: time }),
      });
      if (res.ok) {
        setScheduleTime(time);
      }
    } catch {
      // Ignore
    } finally {
      setScheduleSaving(false);
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
      const [statsRes, leadsRes] = await Promise.all([
        fetch('/api/campaigns'),
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

      // Refresh campaigns list
      await fetchCampaigns();
      setDeleteConfirm(null);
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
        alert(`${failed.length} campagne(s) n'ont pas pu être supprimée(s).`);
      }
      await fetchCampaigns();
      exitSelectMode();
    } catch (error: any) {
      console.error('Error bulk deleting campaigns:', error);
      alert(`Erreur: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black relative">
      <div>
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Gmail Error Banner */}
          {gmailError && (
            <div className="mb-6 bg-red-900/20 border border-red-700/50 rounded-xl p-4 flex items-start justify-between gap-4">
              <p className="text-sm text-red-200">{gmailError}</p>
              <button
                onClick={() => setGmailError(null)}
                className="text-red-400 hover:text-red-300 text-sm shrink-0"
              >
                Fermer
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
                    <p className="font-semibold text-amber-200">Compte Gmail non connecté</p>
                    <p className="text-sm text-amber-200/80">
                      Connectez votre Gmail pour recevoir les drafts d&apos;emails générés dans votre boîte mail
                    </p>
                  </div>
                </div>
                <Link
                  href="/preferences"
                  className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl font-semibold transition-colors"
                >
                  <MailCheck className="w-4 h-4" />
                  Connecter Gmail
                </Link>
              </div>
            </div>
          )}

          {/* Header Section */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-display font-bold text-zinc-900 dark:text-white">
                My Campaigns
              </h1>
            </div>
            <div className="flex items-center gap-4">
              {/* Schedule daily launch */}
              <div className="flex items-center gap-2 bg-sky-50 dark:bg-sky-950/40 rounded-full px-3 py-1.5 shadow-sm">
                <Clock className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 flex-shrink-0" />
                <label htmlFor="schedule-time" className="text-xs font-medium text-zinc-700 dark:text-neutral-200 whitespace-nowrap">
                  Daily launch:
                </label>
                <input
                  id="schedule-time"
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => {
                    const t = e.target.value;
                    setScheduleTime(t);
                    if (t) saveSchedule(t);
                  }}
                  className="bg-white dark:bg-neutral-800/80 rounded-lg px-2 py-0.5 text-zinc-800 dark:text-neutral-100 text-xs font-medium shadow-inner focus:outline-none focus:ring-2 focus:ring-sky-400/50"
                />
                {scheduleSaving && (
                  <span className="text-[10px] text-zinc-500 dark:text-neutral-400">Saving...</span>
                )}
              </div>
              <div className="w-64">
                <CreditsGauge />
              </div>
            </div>
          </div>

          {/* Campaigns List */}
          {loading ? (
            <div className="bg-neutral-800/80 rounded-xl border border-neutral-700 shadow-xl p-12 text-center mb-8">
              <p className="text-neutral-400">Loading campaigns...</p>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="bg-neutral-800/80 rounded-xl border border-neutral-700 shadow-xl p-12 text-center mb-8">
              <p className="text-neutral-400 mb-4">No campaigns yet</p>
              <Link
                href="/campaigns/new"
                className="inline-flex items-center gap-2 bg-sky-400 hover:bg-sky-300 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200"
              >
                <Plus className="w-5 h-5" />
                Create your first campaign
              </Link>
            </div>
          ) : (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                {!selectMode ? (
                  <button
                    onClick={() => setSelectMode(true)}
                    className="px-2 py-1 text-xs bg-sky-100 dark:bg-[#051a28] text-zinc-800 dark:text-white rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Select
                  </button>
                ) : (
                  <>
                    <button
                      onClick={exitSelectMode}
                      className="px-2 py-1 text-xs bg-sky-100 dark:bg-[#051a28] text-zinc-800 dark:text-white rounded-lg hover:opacity-90 transition-opacity"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => setBulkDeleteConfirm(true)}
                      disabled={selectedCampaignIds.size === 0}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-600/80 border border-red-500/50 rounded-lg text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Supprimer ({selectedCampaignIds.size})
                    </button>
                  </>
                )}
                <Link
                  href="/campaigns/new"
                  className="flex items-center gap-2 bg-sky-400 hover:bg-sky-300 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  New Campaign
                </Link>
                <Link
                  href="/todo"
                  className="flex items-center gap-2 px-4 py-2 bg-sky-100 dark:bg-[#051a28] text-zinc-800 dark:text-white rounded-xl hover:opacity-90 transition-opacity text-sm font-medium whitespace-nowrap ml-auto"
                >
                  <ListTodo className="w-4 h-4 text-sky-400 flex-shrink-0" />
                  To-Do
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedCampaigns.map((campaign) => {
                const cardClass = 'bg-sky-50 dark:bg-[#051a28]';
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

                // Calculate targets with email for this campaign
                const campaignCreatedAt = new Date(campaign.createdAt).getTime();
                const campaignLeads = leads.filter((lead: Lead) => {
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
                
                // Count targets with email (valid email, not "No email found)
                const targetsWithEmail = campaignLeads.filter(
                  (lead: Lead) =>
                    lead.email &&
                    lead.email.trim() !== '' &&
                    lead.email.toLowerCase() !== 'no email found'
                ).length;
                
                // Campaign targets count = same as "Campaign Targets" on detail page (limited to numberCreditsUsed)
                const targetLimit = campaign.numberCreditsUsed ?? 20;
                const campaignTargetsCount = Math.min(targetsWithEmail, targetLimit);
                
                // Count drafts created for this campaign
                const draftsCount = campaignLeads.filter(
                  (lead: Lead) => lead.emailDraftCreated
                ).length;

                const isSelected = selectedCampaignIds.has(campaign.id);

                return (
                  <div
                    key={campaign.id}
                    className={`rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-200 group relative ${cardClass} ${selectMode && isSelected ? 'ring-2 ring-sky-500' : ''}`}
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
                      className="block"
                      onClick={(e) => {
                        if (selectMode || editingCampaignId === campaign.id) e.preventDefault();
                      }}
                    >
                      <div className="flex items-start justify-between mb-4">
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
                                className="flex-1 min-w-0 text-lg font-display font-bold text-zinc-900 dark:text-white bg-sky-100 dark:bg-sky-950/80 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-sky-400"
                              />
                            ) : (
                              <>
                                <h3 className="text-lg font-display font-bold text-zinc-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-300 transition-colors flex-1 min-w-0">
                                  {campaign.name?.trim() || campaign.businessType.charAt(0).toUpperCase() + campaign.businessType.slice(1)}
                                </h3>
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
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-red-300 hover:bg-neutral-700 hover:text-red-200 transition-colors"
                                          >
                                            <Trash2 className="w-4 h-4 shrink-0" />
                                            Supprimer
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
                              <span className="truncate text-zinc-500 dark:text-zinc-400" title={campaign.cities.join(', ')}>{campaign.cities.join(', ')}</span>
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
                        <span className="text-zinc-500 dark:text-zinc-400">{formatDate(campaign.createdAt)}</span>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-white/10">
                        <div className="flex items-center gap-2">
                          <Image src="/Icône de groupe de personnes.png" alt="" width={16} height={16} className="w-4 h-4 object-contain [filter:brightness(0)_saturate(100%)_invert(68%)_sepia(60%)_saturate(1200%)_hue-rotate(180deg)] dark:[filter:brightness(0)_invert(1)] opacity-90" />
                          <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{campaign.numberCreditsUsed ?? '-'} targets</span>
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })}
              </div>
              {campaigns.length > 4 && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setShowAllCampaigns((prev) => !prev)}
                    className="text-sm text-sky-500 hover:text-sky-400 font-medium transition-colors"
                  >
                    {showAllCampaigns
                      ? 'Show less'
                      : `Show all campaigns (${campaigns.length - 4} more)`}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {deleteConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-neutral-900 rounded-xl border border-neutral-700 shadow-2xl p-6 max-w-md w-full mx-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-900/20 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-white">
                    Delete Campaign
                  </h3>
                </div>
                
                <p className="text-neutral-300 mb-6">
                  Are you sure you want to delete the campaign <span className="font-semibold text-white">"{deleteConfirm.campaignName}"</span>? This action cannot be undone.
                </p>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    disabled={deleting}
                    className="flex-1 px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-xl font-semibold transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeleteCampaign(deleteConfirm.campaignId, deleteConfirm.campaignName)}
                    disabled={deleting}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {deleting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Deleting...
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
              <div className="bg-neutral-900 rounded-xl border border-neutral-700 shadow-2xl p-6 max-w-md w-full mx-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-900/20 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-white">
                    Supprimer les campagnes
                  </h3>
                </div>
                
                <p className="text-neutral-300 mb-6">
                  Êtes-vous sûr de vouloir supprimer <span className="font-semibold text-white">{selectedCampaignIds.size} campagne(s)</span> ? Cette action est irréversible.
                </p>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setBulkDeleteConfirm(false)}
                    disabled={deleting}
                    className="flex-1 px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-xl font-semibold transition-colors disabled:opacity-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleBulkDeleteCampaigns}
                    disabled={deleting}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {deleting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Suppression...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Supprimer
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* All Targets Section */}
          <div className="mt-12">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-display font-bold text-zinc-900 dark:text-white">
                All Targets ({leads.length})
              </h2>
              {gmailConnected && (
                <button
                  type="button"
                  onClick={async () => {
                    setSyncRepliesLoading(true);
                    try {
                      const res = await fetch('/api/gmail/check-replies', { method: 'POST' });
                      if (res.ok) {
                        await Promise.all([fetchLeads(), fetchCampaigns()]);
                      }
                    } finally {
                      setSyncRepliesLoading(false);
                    }
                  }}
                  disabled={syncRepliesLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-green-100 dark:bg-green-500/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-500/30 hover:bg-green-200 dark:hover:bg-green-500/30 transition-colors disabled:opacity-50"
                >
                  {syncRepliesLoading ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                      Syncing…
                    </>
                  ) : (
                    <>✅ Sync Replies</>
                  )}
                </button>
              )}
            </div>
            <StatsCards stats={stats} />
            <LeadsTable
              leads={leads}
              loading={loadingLeads}
              filterBusinessType={filterBusinessType}
              filterCity={filterCity}
              filterReplied={filterReplied}
              onDraftModalOpenChange={(open) => { draftModalOpenRef.current = open; }}
              onFilterBusinessTypeChange={setFilterBusinessType}
              onFilterCityChange={setFilterCity}
              onFilterRepliedChange={setFilterReplied}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
