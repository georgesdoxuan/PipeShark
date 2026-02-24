'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import LeadsTable from '@/components/LeadsTable';
import CreditsGauge from '@/components/CreditsGauge';
import { useApiPause } from '@/contexts/ApiPauseContext';
import { useCampaignLoading } from '@/contexts/CampaignLoadingContext';
import { ArrowLeft, RefreshCw, Play, Loader2, FileText, X, ChevronDown, ChevronUp, MailX, MessageCircle, Target, CircleDollarSign, Briefcase, Send } from 'lucide-react';
import Link from 'next/link';
import EditCampaignModal from '@/components/EditCampaignModal';

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
}

interface Campaign {
  id: string;
  name?: string;
  businessType: string;
  companyDescription?: string;
  toneOfVoice?: string;
  campaignGoal?: string;
  magicLink?: string;
  cities?: string[];
  citySize?: string;
  numberCreditsUsed?: number;
  createdAt: string;
  status: 'active' | 'completed';
}

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [campaignLeads, setCampaignLeads] = useState<Lead[]>([]);
  const [todayLeadsWithEmail, setTodayLeadsWithEmail] = useState(0);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runMessage, setRunMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDescription, setShowDescription] = useState(false);
  const [showEditSettings, setShowEditSettings] = useState(false);
  const [showLeadsWithoutEmail, setShowLeadsWithoutEmail] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [enqueueLoading, setEnqueueLoading] = useState(false);
  const [enqueueMessage, setEnqueueMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [dailyLimit, setDailyLimit] = useState(300);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPausedRef = useRef(false);
  const draftModalOpenRef = useRef(false);
  const runInProgressRef = useRef(false);
  const { isPaused } = useApiPause();
  const { startLoading, stopLoading } = useCampaignLoading();
  
  // Update ref when isPaused changes
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    fetch('/api/campaigns/count-today')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d && typeof d.limit === 'number') setDailyLimit(d.limit); })
      .catch(() => {});
  }, []);

  // Split leads: main table shows ALL leads with email (no limit per run)
  const { mainLeads, leadsWithoutEmail } = useMemo(() => {
    const withEmail = campaignLeads.filter(
      (l) => l.email && l.email.trim() !== '' && l.email.toLowerCase() !== 'no email found'
    );
    const withoutEmail = campaignLeads.filter(
      (l) => !l.email || l.email.trim() === '' || l.email.toLowerCase() === 'no email found'
    );
    return {
      mainLeads: withEmail,
      leadsWithoutEmail: withoutEmail,
    };
  }, [campaignLeads]);

  useEffect(() => {
    // Only fetch if not paused
    if (!isPaused) {
      fetchData();
    }
    
    // Refresh data every 45 seconds (only if not paused and draft modal is closed)
    const refreshInterval = setInterval(() => {
      if (!isPaused && !draftModalOpenRef.current) {
        fetchData();
      }
    }, 45000);
    
    // Cleanup polling interval on unmount
    return () => {
      clearInterval(refreshInterval);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [campaignId, isPaused]);

  async function fetchData() {
    // Don't fetch if paused
    if (isPaused) {
      return;
    }
    
    setLoading(true);
    try {
      // Fetch campaign details
      const campaignsRes = await fetch('/api/campaigns/list');
      const campaignsData = await campaignsRes.json();
      const foundCampaign = Array.isArray(campaignsData)
        ? campaignsData.find((c: Campaign) => c.id === campaignId)
        : null;

      if (!foundCampaign) {
        router.push('/');
        return;
      }

      setCampaign(foundCampaign);

      // Fetch leads for this campaign (uses campaign_id, fallback for leads without campaign_id)
      const leadsRes = await fetch(`/api/campaigns/${encodeURIComponent(campaignId)}/leads`);
      const leadsData = await leadsRes.json();

      if (leadsRes.ok && Array.isArray(leadsData)) {
        setCampaignLeads(leadsData);

        // Count leads with email created today
        const today = new Date().toISOString().split('T')[0];
        const todayLeadsWithEmail = leadsData.filter((lead: Lead) => {
          if (!lead.email || lead.email.trim() === '' || lead.email.toLowerCase() === 'no email found') {
            return false;
          }
          if (lead.date) {
            const leadDate = new Date(lead.date).toISOString().split('T')[0];
            return leadDate === today;
          }
          return false;
        }).length;

        setTodayLeadsWithEmail(todayLeadsWithEmail);
      } else {
        setCampaignLeads([]);
        setTodayLeadsWithEmail(0);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setCampaignLeads([]);
    } finally {
      setLoading(false);
    }
  }

  async function runCampaign() {
    if (!campaign) return;
    if (runInProgressRef.current) return; // Prevent double click / double submit
    runInProgressRef.current = true;

    setRunning(true);
    setRunMessage(null);

    // Start global loading animation in header immediately for 20 seconds
    startLoading();
    setTimeout(() => {
      stopLoading();
    }, 20000);

    // Store initial lead count
    const initialLeadCount = campaignLeads.length;
    let checkCount = 0;
    const maxChecks = 60; // Maximum 5 minutes (60 checks * 5 seconds)

    try {
      const response = await fetch('/api/campaign/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessType: campaign.businessType,
          ...(campaign.companyDescription && { companyDescription: campaign.companyDescription }),
          cities: campaign.cities && campaign.cities.length > 0 ? campaign.cities : undefined,
          citySize: campaign.citySize,
          campaignId: campaign.id, // Pass existing campaign ID
          targetCount: campaign.numberCreditsUsed ?? 20, // Respect the campaign's target count on re-run
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setRunMessage({ type: 'error', text: [data.error, data.hint].filter(Boolean).join(' ') || data.error || data.details || 'Please wait before running again.' });
          setTimeout(() => setRunMessage(null), 8000);
          setRunning(false);
          runInProgressRef.current = false;
          return;
        }
        throw new Error(data.error || data.details || 'Error running campaign');
      }

      setRunMessage({ type: 'success', text: '🔄 Campaign started! Waiting for new targets...' });
      
      // Clear any existing polling interval
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }

          // Poll for new leads (only if not paused)
          pollingIntervalRef.current = setInterval(async () => {
            // Skip if API requests are paused (use ref to get current value)
            if (isPausedRef.current) {
              return;
            }
            
            checkCount++;
            
            try {
              // Fetch leads for this campaign (uses campaign_id, fallback for leads without campaign_id)
              const leadsRes = await fetch(`/api/campaigns/${encodeURIComponent(campaignId)}/leads`);
              const leadsData = await leadsRes.json();

              if (leadsRes.ok && Array.isArray(leadsData)) {
                // Check if we have new leads
                if (leadsData.length > initialLeadCount) {
                  if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                    pollingIntervalRef.current = null;
                  }
                  setCampaignLeads(leadsData);
                  
                  const today = new Date().toISOString().split('T')[0];
                  const count = leadsData.filter((lead: Lead) => {
                    if (lead.email && lead.email.trim() !== '' && lead.email.toLowerCase() !== 'no email found') {
                      if (lead.date) {
                        const leadDate = new Date(lead.date).toISOString().split('T')[0];
                        return leadDate === today;
                      }
                    }
                    return false;
                  }).length;

                  setTodayLeadsWithEmail(count);

                  setRunMessage({ type: 'success', text: `✅ ${leadsData.length - initialLeadCount} new target(s) found!` });
                  setTimeout(() => setRunMessage(null), 5000);
                  setRunning(false);
                  runInProgressRef.current = false;
                } else if (checkCount >= maxChecks) {
              // Timeout after max checks
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
              setRunMessage({ type: 'error', text: '⏱️ Timeout: No new targets found after 5 minutes. Please check again later.' });
              setTimeout(() => setRunMessage(null), 5000);
              setRunning(false);
              runInProgressRef.current = false;
            } else {
              // Still waiting, update message
              setRunMessage({ type: 'success', text: `🔄 Waiting for new targets... (${checkCount * 10}s)` });
            }
          }
        } catch (error) {
          console.error('Error checking for new leads:', error);
        }
      }, 20000); // Check every 20 seconds
    } catch (error: any) {
      console.error('Error running campaign:', error);
      stopLoading();
      setRunMessage({ type: 'error', text: `❌ ${error.message || 'Error running campaign'}` });
      setTimeout(() => setRunMessage(null), 5000);
      setRunning(false);
      runInProgressRef.current = false;
    }
  }

  async function handleEnqueue() {
    setEnqueueMessage(null);
    setEnqueueLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/enqueue`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setEnqueueMessage({
          type: 'success',
          text: data.message || `${data.enqueued ?? 0} email(s) added to the send queue.`,
        });
        fetchData();
        setTimeout(() => setEnqueueMessage(null), 5000);
      } else {
        const detail = data.details ? ` — ${data.details}` : '';
        setEnqueueMessage({
          type: 'error',
          text: (data.error || data.hint || 'Failed to add to send queue.') + detail,
        });
      }
    } catch (e: any) {
      setEnqueueMessage({ type: 'error', text: e?.message || 'Failed to add to send queue.' });
    } finally {
      setEnqueueLoading(false);
    }
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-white/60 dark:bg-black/70 relative">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white dark:bg-neutral-900/80 rounded-xl border border-zinc-200 dark:border-sky-800/30 shadow-xl p-12 text-center">
            <p className="text-zinc-600 dark:text-sky-300">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white/60 dark:bg-black/70 relative">
      <div>
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back button and header */}
          <div className="flex items-center gap-4 mb-8">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-zinc-600 dark:text-sky-300 hover:text-zinc-900 dark:hover:text-sky-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Campaigns</span>
            </Link>
          </div>

          {/* Daily Credits - same width as dashboard */}
          <div className="mb-6 w-64">
            <CreditsGauge campaignId={campaignId} leadsWithEmail={todayLeadsWithEmail} />
          </div>

          {/* Campaign Info */}
          <div className="bg-white dark:bg-neutral-900/80 rounded-xl border border-zinc-200 dark:border-sky-800/30 shadow-lg p-6 mb-8">
            {runMessage && (
              <div
                className={`mb-4 flex items-center gap-2 p-3 rounded-xl ${
                  runMessage.type === 'success'
                    ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                }`}
              >
                <p className="text-sm font-medium">{runMessage.text}</p>
              </div>
            )}
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h1 className="text-3xl font-display font-bold text-zinc-900 dark:text-white">
                    {campaign.name?.trim() || campaign.businessType.charAt(0).toUpperCase() + campaign.businessType.slice(1)}
                  </h1>
                  <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-700/50">
                    {campaign.businessType}
                  </span>
                  {campaign.companyDescription && (
                    <button
                      onClick={() => setShowDescription(true)}
                      className="flex items-center gap-2 text-zinc-600 dark:text-sky-300 hover:text-zinc-900 dark:hover:text-sky-200 transition-colors text-sm font-medium px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-neutral-800/60 hover:bg-zinc-200 dark:hover:bg-neutral-700/60 border border-zinc-200 dark:border-sky-700/40 hover:border-zinc-300 dark:hover:border-sky-600/50"
                    >
                      <FileText className="w-4 h-4" />
                      <span>My Company Description</span>
                    </button>
                  )}
                  <button
                    onClick={() => setShowEditSettings(true)}
                    className="flex items-center gap-2 text-zinc-600 dark:text-sky-300 hover:text-zinc-900 dark:hover:text-sky-200 transition-colors text-sm font-medium px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-neutral-800/60 hover:bg-zinc-200 dark:hover:bg-neutral-700/60 border border-zinc-200 dark:border-sky-700/40 hover:border-zinc-300 dark:hover:border-sky-600/50"
                  >
                    <span>Edit for next run</span>
                  </button>
                </div>
                {campaign.cities && campaign.cities.length > 0 ? (
                  <p className="text-zinc-700 dark:text-sky-200">
                    Cities: {campaign.cities.join(', ')}
                  </p>
                ) : (
                  <p className="text-zinc-500 dark:text-sky-400/90 text-xs">
                    {(() => {
                      if (!campaign.citySize) return 'Any City';
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
                      return `Any City ${sizeMap[campaign.citySize] || campaign.citySize}`;
                    })()}
                  </p>
                )}
                <p className="text-zinc-500 dark:text-sky-400/90 text-sm mt-2">
                  Created on {new Date(campaign.createdAt).toLocaleDateString('en-US')}
                </p>
                
                {/* Campaign Parameters */}
                <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-sky-800/40">
                  <h3 className="text-sm font-semibold text-zinc-800 dark:text-sky-300 mb-3">Campaign Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-start gap-2">
                      <Briefcase className="w-4 h-4 shrink-0 mt-0.5 text-zinc-500 dark:text-sky-400/90" />
                      <div>
                        <span className="text-zinc-600 dark:text-sky-400">Business type: </span>
                        <span className="text-zinc-800 dark:text-sky-200 capitalize">{campaign.businessType}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MessageCircle className="w-4 h-4 shrink-0 mt-0.5 text-zinc-500 dark:text-sky-400/90" />
                      <div>
                        <span className="text-zinc-600 dark:text-sky-400">Tone of Voice: </span>
                        <span className="text-zinc-800 dark:text-sky-200">
                          {campaign.toneOfVoice === 'professional' ? 'Professional' :
                           campaign.toneOfVoice === 'casual' ? 'Casual / Friendly' :
                           campaign.toneOfVoice === 'direct' ? 'Direct / Bold' :
                           campaign.toneOfVoice === 'empathetic' ? 'Empathetic / Understanding' :
                           campaign.toneOfVoice || 'Not set'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Target className="w-4 h-4 shrink-0 mt-0.5 text-zinc-500 dark:text-sky-400/90" />
                      <div>
                        <span className="text-zinc-600 dark:text-sky-400/90">Campaign Goal: </span>
                        <span className="text-zinc-800 dark:text-sky-200">
                          {campaign.campaignGoal === 'book_call' ? 'Book a phone call' :
                           campaign.campaignGoal === 'free_audit' ? 'Offer a free audit/quote' :
                           campaign.campaignGoal === 'send_brochure' ? 'Send a brochure/portfolio' :
                           campaign.campaignGoal || 'Not set'}
                        </span>
                      </div>
                    </div>
                    {campaign.magicLink && (
                      <div className="md:col-span-2 flex items-center gap-2">
                        <span className="text-zinc-600 dark:text-sky-400/90">Magic Link:</span>
                        <a 
                          href={campaign.magicLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sky-600 dark:text-sky-300 hover:text-sky-700 dark:hover:text-sky-200 ml-1 underline break-all"
                        >
                          {campaign.magicLink}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-4">
                <div className="flex items-center gap-3">
                  {campaign.numberCreditsUsed != null && (
                    <span className="text-sm font-medium text-zinc-700 dark:text-sky-300 inline-flex items-center gap-1.5">
                      <CircleDollarSign className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />
                      {campaign.numberCreditsUsed} credit{campaign.numberCreditsUsed !== 1 ? 's' : ''}
                    </span>
                  )}
                  <button
                    onClick={runCampaign}
                    disabled={running || loading}
                    className="flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-sky-500/30 hover:shadow-sky-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {running ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Running...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        <span>Run</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={fetchData}
                    disabled={loading}
                    className="flex items-center justify-center p-2 rounded-xl bg-white dark:bg-neutral-700 hover:bg-zinc-100 dark:hover:bg-neutral-600 border border-zinc-200 dark:border-sky-700/50 text-zinc-600 dark:text-white shadow-md hover:shadow-lg disabled:opacity-50 transition-all duration-200"
                    aria-label="Refresh"
                  >
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Campaign Targets Table - only leads with email, limited to target count */}
          <div>
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <h2 className="text-2xl font-display font-bold text-zinc-900 dark:text-white">
                Campaign Targets ({mainLeads.length})
              </h2>
              <button
                onClick={handleEnqueue}
                disabled={enqueueLoading || loading || mainLeads.length === 0}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-xl font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                title="Add leads with drafts to the send queue (emails will be sent at random times during business hours in each lead's timezone)"
              >
                {enqueueLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>{enqueueLoading ? 'Adding...' : 'Add to send queue'}</span>
              </button>
            </div>
            {enqueueMessage && (
              <div
                className={`mb-4 flex items-center gap-2 p-3 rounded-xl ${
                  enqueueMessage.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                    : 'bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/30'
                }`}
              >
                <span className="font-medium">{enqueueMessage.text}</span>
              </div>
            )}
            <LeadsTable
              leads={mainLeads}
              loading={loading}
              toneOfVoice={campaign.toneOfVoice}
              campaignIdToName={campaign ? { [campaign.id]: campaign.name || campaign.businessType || 'Campaign' } : undefined}
              onDraftModalOpenChange={(open) => { draftModalOpenRef.current = open; }}
            />

            {/* Additional leads without email - collapsible */}
            {leadsWithoutEmail.length > 0 && (
              <div className="mt-8">
                <button
                  onClick={() => setShowLeadsWithoutEmail(!showLeadsWithoutEmail)}
                  className="flex items-center gap-2 px-4 py-2 text-zinc-600 dark:text-sky-300 hover:text-zinc-900 dark:hover:text-sky-200 hover:bg-zinc-100 dark:hover:bg-neutral-800/60 rounded-xl border border-zinc-200 dark:border-sky-700/40 transition-colors"
                >
                  {showLeadsWithoutEmail ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                  <MailX className="w-4 h-4" />
                  <span className="font-medium">
                    {showLeadsWithoutEmail ? 'Hide' : 'Show'} additional leads without email ({leadsWithoutEmail.length})
                  </span>
                </button>
                {showLeadsWithoutEmail && (
                  <div className="mt-4">
                    <LeadsTable
                      leads={leadsWithoutEmail}
                      loading={false}
                      filterByEmail={false}
                      toneOfVoice={campaign.toneOfVoice}
                      campaignIdToName={campaign ? { [campaign.id]: campaign.name || campaign.businessType || 'Campaign' } : undefined}
                      onDraftModalOpenChange={(open) => { draftModalOpenRef.current = open; }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Campaign Settings Modal */}
      {showEditSettings && campaign && (
        <EditCampaignModal
          campaign={campaign}
          onClose={() => setShowEditSettings(false)}
          maxCreditsPerCampaign={dailyLimit}
          onSave={async (updates) => {
            setEditSaving(true);
            try {
              const res = await fetch(`/api/campaigns/${campaignId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
              });
              if (res.ok) {
                const updated = await res.json();
                setCampaign(updated);
                setShowEditSettings(false);
              }
            } finally {
              setEditSaving(false);
            }
          }}
          saving={editSaving}
        />
      )}

      {/* Company Description Modal */}
      {showDescription && campaign.companyDescription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-neutral-900 rounded-xl border border-sky-800/40 shadow-2xl shadow-sky-950/30 max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-sky-800/40">
              <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5" />
                My Company Description
              </h2>
              <button
                onClick={() => setShowDescription(false)}
                className="text-sky-400 hover:text-sky-300 transition-colors p-1 rounded-lg hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <p className="text-sky-200 leading-relaxed whitespace-pre-wrap">
                {campaign.companyDescription}
              </p>
            </div>
            <div className="p-6 border-t border-sky-800/40 flex justify-end">
              <button
                onClick={() => setShowDescription(false)}
                className="px-6 py-2 bg-sky-700 hover:bg-sky-600 text-white rounded-lg font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
