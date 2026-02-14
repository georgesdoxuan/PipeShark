'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, CheckCircle2, XCircle, RefreshCw, X, Sparkles, FileText, Trash2, ArrowLeft, Save, MapPin, Building2, Mail, Shuffle } from 'lucide-react';
import { useCampaignLoading } from '@/contexts/CampaignLoadingContext';
import { drawRandomCityCountry, type CityCountry } from '@/lib/cities-countries';

export type CampaignMode = 'standard' | 'local_businesses';

export interface CampaignFormState {
  campaignName: string;
  campaignMode: CampaignMode;
  businessType: string;
  companyDescription: string;
  exampleEmail: string;
  toneOfVoice: string;
  campaignGoal: string;
  magicLink: string;
  citySize: string;
  cities: string;
  targetCount: number;
}

const DEFAULT_FORM_STATE: CampaignFormState = {
  campaignName: '',
  campaignMode: 'local_businesses',
  businessType: '',
  companyDescription: '',
  exampleEmail: '',
  toneOfVoice: 'professional',
  campaignGoal: 'book_call',
  magicLink: '',
  citySize: '1M+',
  cities: '',
  targetCount: 10,
};

interface CampaignFormProps {
  onSuccess?: (campaignId: string) => void;
  initialFormState?: Partial<CampaignFormState>;
  showBackAndSave?: boolean;
  onBack?: () => void;
  onSaveDraft?: (state: CampaignFormState) => void;
}

const MAX_PER_CAMPAIGN = 300; // Max leads per campaign launch (testing)

export default function CampaignForm({
  onSuccess,
  initialFormState,
  showBackAndSave,
  onBack,
  onSaveDraft,
}: CampaignFormProps) {
  const { startLoading, stopLoading } = useCampaignLoading();
  const baseline = useRef<CampaignFormState>({ ...DEFAULT_FORM_STATE, ...initialFormState });
  const [campaignName, setCampaignName] = useState(baseline.current.campaignName);
  const [campaignMode, setCampaignMode] = useState<CampaignMode>(baseline.current.campaignMode);
  const [businessType, setBusinessType] = useState(baseline.current.businessType);
  const [companyDescription, setCompanyDescription] = useState(baseline.current.companyDescription);
  const [exampleEmail, setExampleEmail] = useState(baseline.current.exampleEmail);
  const [toneOfVoice, setToneOfVoice] = useState(baseline.current.toneOfVoice);
  const [campaignGoal, setCampaignGoal] = useState(baseline.current.campaignGoal);
  const [magicLink, setMagicLink] = useState(baseline.current.magicLink);
  const [citySize, setCitySize] = useState(baseline.current.citySize);
  const [cities, setCities] = useState(baseline.current.cities);
  const [targetCount, setTargetCount] = useState(baseline.current.targetCount);
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [draftSavedFeedback, setDraftSavedFeedback] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showRefreshMessage, setShowRefreshMessage] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Generation progress states
  const [generating, setGenerating] = useState(false);
  const [currentCount, setCurrentCount] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [lastNewLeadsCount, setLastNewLeadsCount] = useState(0);
  const [todayLeadsCount, setTodayLeadsCount] = useState(0);
  const [pollingStatus, setPollingStatus] = useState<string>('');
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cancelRef = useRef(false);
  
  // Validation states
  const [errors, setErrors] = useState<{
    businessType?: string;
    companyDescription?: string;
    magicLink?: string;
    targetCount?: string;
  }>({});
  const [touched, setTouched] = useState<{
    businessType?: boolean;
    companyDescription?: boolean;
    magicLink?: boolean;
  }>({});
  const [mergedDescriptions, setMergedDescriptions] = useState<{ id?: string; content: string; displayName: string; source: 'saved' | 'campaign' }[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<{ id: string; name?: string; content: string; createdAt: string }[]>([]);
  const [drawnCityCountry, setDrawnCityCountry] = useState<CityCountry | null>(null);

  const currentFormState: CampaignFormState = {
    campaignName,
    campaignMode,
    businessType,
    companyDescription,
    exampleEmail,
    toneOfVoice,
    campaignGoal,
    magicLink,
    citySize,
    cities,
    targetCount,
  };

  const hasChanges =
    campaignName !== baseline.current.campaignName ||
    campaignMode !== baseline.current.campaignMode ||
    businessType !== baseline.current.businessType ||
    companyDescription !== baseline.current.companyDescription ||
    exampleEmail !== baseline.current.exampleEmail ||
    toneOfVoice !== baseline.current.toneOfVoice ||
    campaignGoal !== baseline.current.campaignGoal ||
    magicLink !== baseline.current.magicLink ||
    citySize !== baseline.current.citySize ||
    cities !== baseline.current.cities ||
    targetCount !== baseline.current.targetCount;

  function handleSaveDraft() {
    onSaveDraft?.(currentFormState);
    baseline.current = { ...currentFormState };
    setDraftSavedFeedback(true);
    setTimeout(() => setDraftSavedFeedback(false), 2000);
  }

  function handleBackClick() {
    if (hasChanges) {
      setShowBackConfirm(true);
    } else {
      onBack?.();
    }
  }

  function confirmBack() {
    setShowBackConfirm(false);
    onBack?.();
  }
  
  // Validate magic link
  const isValidUrl = (url: string): boolean => {
    if (!url.trim()) return true; // Empty is valid (optional field)
    return url.trim().startsWith('http://') || url.trim().startsWith('https://');
  };
  
  // Validate form
  const isFormValid = (): boolean => {
    const descTrimmed = companyDescription.trim();
    return (
      businessType.trim() !== '' &&
      descTrimmed.length >= 50 &&
      descTrimmed.length <= 500 &&
      isValidUrl(magicLink) &&
      targetCount >= 1 &&
      targetCount <= MAX_PER_CAMPAIGN
    );
  };
  
  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearTimeout(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  async function fetchAllDescriptions() {
    try {
      const [savedRes, campaignsRes, templatesRes] = await Promise.all([
        fetch('/api/company-descriptions'),
        fetch('/api/campaigns/list'),
        fetch('/api/email-templates'),
      ]);
      const saved: { id: string; content: string; campaignName?: string; createdAt: string }[] = savedRes.ok ? await savedRes.json() : [];
      const campaigns: { companyDescription?: string; name?: string; businessType?: string }[] = campaignsRes.ok ? await campaignsRes.json() : [];

      const byContent = new Map<string, { id?: string; content: string; displayName: string; source: 'saved' | 'campaign' }>();
      for (const d of Array.isArray(saved) ? saved : []) {
        const c = d.content?.trim();
        if (c && c.length >= 50 && !byContent.has(c)) {
          const displayName = d.campaignName?.trim() || 'Saved';
          byContent.set(c, { id: d.id, content: c, displayName, source: 'saved' });
        }
      }
      for (const camp of Array.isArray(campaigns) ? campaigns : []) {
        const c = camp.companyDescription?.trim();
        if (c && c.length >= 50 && !byContent.has(c)) {
          const displayName = camp.name?.trim() || camp.businessType || 'Campaign';
          byContent.set(c, { content: c, displayName, source: 'campaign' });
        }
      }
      setMergedDescriptions(Array.from(byContent.values()));

      const templates: { id: string; name?: string; content: string; createdAt: string }[] = templatesRes.ok ? await templatesRes.json() : [];
      setEmailTemplates(Array.isArray(templates) ? templates : []);
    } catch {
      // Ignore
    }
  }

  useEffect(() => {
    fetchAllDescriptions();
  }, []);

  useEffect(() => {
    if (initialFormState && Object.keys(initialFormState).length > 0) {
      const merged = { ...DEFAULT_FORM_STATE, ...initialFormState };
      baseline.current = merged;
      setCampaignName(merged.campaignName);
      setCampaignMode(merged.campaignMode === 'standard' ? 'local_businesses' : merged.campaignMode);
      setBusinessType(merged.businessType);
      setCompanyDescription(merged.companyDescription);
      setExampleEmail(merged.exampleEmail ?? '');
      setToneOfVoice(merged.toneOfVoice);
      setCampaignGoal(merged.campaignGoal);
      setMagicLink(merged.magicLink);
      setCitySize(merged.citySize);
      setCities(merged.cities);
      setTargetCount(merged.targetCount);
      setDrawnCityCountry(null);
    }
  }, [initialFormState]);
  
  // Fetch and count campaign leads (uses campaign_id, fallback for leads without campaign_id)
  const fetchCampaignLeadsCount = async (
    campaignId: string,
    _businessType: string,
    _cities: string[],
    _campaignCreatedAt: string
  ): Promise<number> => {
    try {
      const response = await fetch(`/api/campaigns/${encodeURIComponent(campaignId)}/leads`);
      const leads = await response.json();
      
      if (!response.ok || !Array.isArray(leads)) {
        throw new Error('Failed to fetch leads');
      }
      
      // Count leads with valid email (API already filters by campaign_id)
      const campaignLeadsWithEmail = leads.filter((lead: any) =>
        lead.email &&
        lead.email.trim() !== '' &&
        lead.email.toLowerCase() !== 'no email found'
      );
      
      console.log(`📊 Campaign leads with email: ${campaignLeadsWithEmail.length}`);
      return campaignLeadsWithEmail.length;
    } catch (error) {
      console.error('Error fetching campaign leads:', error);
      throw error;
    }
  };
  
  // Poll for new leads in the campaign
  const waitForNewCampaignLeads = async (
    initialCount: number,
    campaignId: string,
    businessType: string,
    citiesArray: string[],
    campaignCreatedAt: string,
    maxWaitTime: number = 40000
  ): Promise<number> => {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const poll = async () => {
        if (cancelRef.current) {
          if (pollingIntervalRef.current) {
            clearTimeout(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          reject(new Error('Cancelled'));
          return;
        }
        
        if (Date.now() - startTime > maxWaitTime) {
          if (pollingIntervalRef.current) {
            clearTimeout(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          reject(new Error('Timeout'));
          return;
        }
        
        try {
          setPollingStatus('⏳ Checking table...');
          const newCount = await fetchCampaignLeadsCount(
            campaignId,
            businessType,
            citiesArray,
            campaignCreatedAt
          );
          
          if (newCount > initialCount) {
            const newLeads = newCount - initialCount;
            setLastNewLeadsCount(newLeads);
            setPollingStatus(`✨ +${newLeads} new leads detected!`);
            
            if (pollingIntervalRef.current) {
              clearTimeout(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            
            // Clear status message after 2 seconds
            setTimeout(() => {
              setPollingStatus('');
            }, 2000);
            
            resolve(newCount);
            return;
          }
          
          // Continue polling after 6 seconds
          pollingIntervalRef.current = setTimeout(poll, 6000);
        } catch (error) {
          if (pollingIntervalRef.current) {
            clearTimeout(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          reject(error);
        }
      };
      
      poll();
    });
  };
  
  // Note: We don't load today's count on mount anymore since we count per campaign
  // The count will be set when a campaign is created
  
  const handleCancel = () => {
    cancelRef.current = true;
    setGenerating(false);
    if (pollingIntervalRef.current) {
      clearTimeout(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setLoading(false);
    stopLoading();
    setPollingStatus('');
    setMessage({ type: 'error', text: 'Generation cancelled' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched
    setTouched({
      businessType: true,
      companyDescription: true,
      magicLink: true,
    });
    
    // Validate all fields
    const newErrors: typeof errors = {};
    if (!businessType.trim()) {
      newErrors.businessType = 'Business type is required';
    }
    
    const descriptionTrimmed = companyDescription.trim();
    if (!descriptionTrimmed || descriptionTrimmed.length < 50) {
      newErrors.companyDescription = 'Description must be at least 50 characters';
    } else if (descriptionTrimmed.length > 500) {
      newErrors.companyDescription = 'Description cannot exceed 500 characters';
    }
    
    if (!isValidUrl(magicLink)) {
      newErrors.magicLink = 'URL must start with http:// or https://';
    }
    
    if (targetCount < 1 || targetCount > MAX_PER_CAMPAIGN) {
      newErrors.targetCount = `Target count must be between 1 and ${MAX_PER_CAMPAIGN}`;
    }
    
    setErrors(newErrors);
    
    // If there are errors, don't submit
    if (Object.keys(newErrors).length > 0) {
      setMessage({ type: 'error', text: 'Please correct the errors in the form' });
      return;
    }
    
    // Check daily quota BEFORE starting generation
    setLoading(true);
    setMessage(null);
    
    try {
      const quotaRes = await fetch('/api/campaigns/count-today');
      if (quotaRes.ok) {
        const quota = await quotaRes.json();
        if (quota.remaining === 0) {
          setLoading(false);
          setMessage({ type: 'error', text: 'Daily quota reached. Come back tomorrow.' });
          return;
        }
      }

      // Parse cities array
      const citiesArray = cities
        .split(',')
        .map(city => city.trim())
        .filter(city => city.length > 0);

      // Step 1: Create campaign first to get campaignId (with targetCount for Daily Credits)
      console.log('📝 Creating campaign...');
      const payload: any = {
        name: campaignName.trim() || undefined,
        mode: campaignMode,
        businessType: businessType.trim(),
        companyDescription: descriptionTrimmed,
        toneOfVoice: toneOfVoice,
        campaignGoal: campaignGoal,
        magicLink: magicLink.trim(),
        targetCount: targetCount,
      };
      if (exampleEmail.trim()) payload.exampleEmail = exampleEmail.trim();
      if (citiesArray.length > 0) {
        payload.cities = citiesArray;
        if (drawnCityCountry && citiesArray.length === 1 && citiesArray[0] === drawnCityCountry.city) {
          payload.country = drawnCityCountry.country;
        }
      } else {
        payload.citySize = citySize;
      }

      console.log('📤 Sending payload to /api/campaign/start:', payload);

      const createResponse = await fetch('/api/campaign/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      let createData: { campaignId?: string; campaign?: { createdAt?: string }; error?: string; details?: string; hint?: string } = {};
      try {
        const text = await createResponse.text();
        if (text) createData = JSON.parse(text);
      } catch {
        createData = { error: createResponse.statusText || 'Request failed' };
      }
      console.log('📥 Response from /api/campaign/start:', createData);

      if (!createResponse.ok) {
        const message = [createData.error, createData.hint].filter(Boolean).join(' ') || createData.details || createResponse.statusText || 'Error launching campaign';
        console.error('❌ API error:', message, createData);
        throw new Error(message);
      }
      
      const campaignId = createData.campaignId;
      const campaignCreatedAt = createData.campaign?.createdAt || new Date().toISOString();
      
      console.log('✅ Campaign created:', campaignId, 'Created at:', campaignCreatedAt);
      
      // Step 2: Count initial campaign leads (should be 0 for new campaign)
      console.log('📊 Counting initial campaign leads...');
      const initialCount = await fetchCampaignLeadsCount(
        campaignId,
        businessType.trim(),
        citiesArray,
        campaignCreatedAt
      );
      console.log(`📊 Initial campaign leads count: ${initialCount}, Target: ${targetCount}`);
      
      // Reset states for generation
      cancelRef.current = false;
      setGenerating(true);
      setCurrentCount(initialCount);
      setTodayLeadsCount(initialCount);
      setAttempts(0);
      setLastNewLeadsCount(0);
      setPollingStatus('');
      
      // Start global loading animation in header IMMEDIATELY
      startLoading();
      
      let currentCount = initialCount;
      let workflowAttempts = 0;
      const maxAttempts = 10;
      
      // Step 3: Loop until target is reached or max attempts
      console.log(`🔄 Starting generation loop: currentCount=${currentCount}, targetCount=${targetCount}, maxAttempts=${maxAttempts}`);
      
      while (currentCount < targetCount && workflowAttempts < maxAttempts && !cancelRef.current) {
        workflowAttempts++;
        setAttempts(workflowAttempts);
        
        // Launch workflow (use existing campaign)
        console.log(`🚀 Launching workflow - Attempt ${workflowAttempts}/${maxAttempts}`);
        try {
          const runPayload: any = {
            mode: campaignMode,
            businessType: businessType.trim(),
            companyDescription: descriptionTrimmed,
            toneOfVoice: toneOfVoice,
            campaignGoal: campaignGoal,
            magicLink: magicLink.trim(),
            campaignId: campaignId,
            targetCount: targetCount, // So n8n can stop after X leads with email
          };
          if (exampleEmail.trim()) runPayload.exampleEmail = exampleEmail.trim();
          if (citiesArray.length > 0) {
            runPayload.cities = citiesArray;
            if (drawnCityCountry && citiesArray.length === 1 && citiesArray[0] === drawnCityCountry.city) {
              runPayload.country = drawnCityCountry.country;
            }
          } else {
            runPayload.citySize = citySize;
          }

          console.log('📤 Sending payload to /api/campaign/start (run):', runPayload);

          const response = await fetch('/api/campaign/start', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(runPayload),
          });

          let data: { error?: string; details?: string; hint?: string } = {};
          try {
            const text = await response.text();
            if (text) data = JSON.parse(text);
          } catch {
            data = { error: response.statusText || 'Request failed' };
          }
          console.log('📥 Response from /api/campaign/start (run):', data);

          if (!response.ok) {
            const message = [data.error, data.hint].filter(Boolean).join(' ') || data.details || response.statusText || 'Error launching campaign';
            console.error('❌ API error:', message, data);
            throw new Error(message);
          }

          console.log('✅ Workflow launched successfully');
        } catch (error: any) {
          console.error('❌ Failed to launch workflow:', error);
          throw new Error(error.message || 'Failed to launch workflow');
        }
        
        // Wait for new leads to appear in campaign (polling)
        try {
          const newCount = await waitForNewCampaignLeads(
            currentCount,
            campaignId,
            businessType.trim(),
            citiesArray,
            campaignCreatedAt,
            40000
          );
          currentCount = newCount;
          setCurrentCount(newCount);
          setTodayLeadsCount(newCount);
          
          // If we've reached the target, stop
          if (currentCount >= targetCount) {
            console.log(`✅ Target reached: ${currentCount} >= ${targetCount}`);
            break;
          }
        } catch (error: any) {
          if (error.message === 'Cancelled') {
            return;
          }
          // If timeout or error, continue to next attempt
          setPollingStatus(`⚠️ No leads found in this search. Attempt ${workflowAttempts}/${maxAttempts}: 0 new leads`);
          console.warn('Polling timeout or error, continuing...', error);
        }
      }
      
      // Cleanup
      if (pollingIntervalRef.current) {
        clearTimeout(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      
      if (cancelRef.current) {
        return;
      }
      
      // Success
      setGenerating(false);
      setLoading(false);
      stopLoading();
      setPollingStatus('');
      
      const generatedLeads = currentCount - initialCount;
      if (currentCount >= targetCount) {
        setMessage({ 
          type: 'success', 
          text: `✅ Successfully generated ${generatedLeads} leads for this campaign! Total: ${currentCount}/${targetCount}` 
        });
      } else if (workflowAttempts >= maxAttempts) {
        setMessage({ 
          type: 'error', 
          text: `⚠️ Reached maximum attempts (${maxAttempts}). Generated ${generatedLeads} leads. Total: ${currentCount}/${targetCount}` 
        });
      }
      
      // Call onSuccess callback with campaign ID if provided
      if (campaignId && onSuccess) {
        onSuccess(campaignId);
      }

      // Refresh company descriptions (new one may have been added)
      fetchAllDescriptions();
      
      // Reset form after success
      setCampaignName('');
      setCampaignMode('standard');
      setBusinessType('');
      setCompanyDescription('');
      setToneOfVoice('professional');
      setCampaignGoal('book_call');
      setMagicLink('');
      setCitySize('1M+');
      setCities('');
      setDrawnCityCountry(null);
      setTargetCount(10);
      setErrors({});
      setTouched({});
    } catch (error: any) {
      setGenerating(false);
      setLoading(false);
      stopLoading();
      
      if (pollingIntervalRef.current) {
        clearTimeout(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      
      if (!cancelRef.current) {
        setMessage({ type: 'error', text: `❌ ${error.message || 'Unknown error'}` });
      }
      setPollingStatus('');
      console.error('CampaignForm error:', error);
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-900/95 rounded-xl shadow-lg p-6 mb-8 border border-zinc-200 dark:border-sky-800/30">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-zinc-900 dark:text-white">
            New Prospecting Campaign
          </h2>
          <p className="text-sm text-zinc-600 dark:text-sky-200 mt-1">
            Configure targeting, email personalization, and launch settings below
          </p>
        </div>
        {showBackAndSave && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={handleBackClick}
              disabled={loading || generating}
              className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 dark:text-sky-200 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-neutral-800/80 rounded-lg border border-zinc-300 dark:border-sky-700/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={loading || generating || !hasChanges}
              className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 dark:text-sky-200 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-neutral-800/80 rounded-lg border border-zinc-300 dark:border-sky-700/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {draftSavedFeedback ? 'Saved!' : 'Save draft'}
            </button>
          </div>
        )}
      </div>

      {showBackConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-900/95 rounded-xl shadow-xl border border-zinc-200 dark:border-sky-700/40 p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">Unsaved changes</h3>
            <p className="text-zinc-600 dark:text-sky-200 text-sm mb-4">
              You have unsaved changes. If you go back now, your modifications will be lost. Do you want to continue?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowBackConfirm(false)}
                className="px-4 py-2 text-sm text-zinc-600 dark:text-sky-200 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-neutral-800/80 rounded-lg border border-zinc-300 dark:border-sky-700/40 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmBack}
                className="px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg border border-red-300 dark:border-red-800/50 transition-colors"
              >
                Leave without saving
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="campaignName"
            className="block text-sm font-semibold text-zinc-700 dark:text-sky-200 mb-2"
          >
            Campaign Name <span className="text-zinc-500 dark:text-sky-400/90 text-xs">(optional)</span>
          </label>
          <input
            id="campaignName"
            type="text"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            placeholder="e.g. Plumbers NYC, Electricians Q1"
            className="w-full px-4 py-3 border border-zinc-300 dark:border-sky-700/40 rounded-xl bg-white dark:bg-neutral-800/80 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-sky-400/70 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all shadow-sm"
            disabled={loading}
          />
          <p className="text-xs text-zinc-500 dark:text-sky-400/90 mt-1">
            A friendly name to identify this campaign. Used when selecting company descriptions.
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-zinc-700 dark:text-sky-200 mb-2">
            Campaign Mode
          </label>
          <div className="flex gap-4">
            <label className="hidden flex items-center gap-2 cursor-pointer group">
              <input
                type="radio"
                name="campaignMode"
                value="standard"
                checked={campaignMode === 'standard'}
                onChange={() => setCampaignMode('standard')}
                className="w-4 h-4 accent-sky-500"
                disabled={loading}
              />
              <span className="flex items-center gap-2 text-zinc-600 dark:text-sky-200 group-hover:text-zinc-900 dark:group-hover:text-white">
                <Building2 className="w-4 h-4" />
                Standard
              </span>
            </label>
            <input type="hidden" name="campaignMode" value="local_businesses" />
            <div className="flex items-center gap-2 text-zinc-600 dark:text-sky-200">
              <MapPin className="w-4 h-4" />
              <span>Local businesses (Google Maps)</span>
            </div>
          </div>
          <p className="text-xs text-zinc-500 dark:text-sky-400/90 mt-1">
            Local businesses: target businesses found on Google Maps.
          </p>
        </div>

        <div>
          <label
            htmlFor="businessType"
            className="block text-sm font-semibold text-zinc-700 dark:text-sky-200 mb-2"
          >
            Business Type <span className="text-red-500">*</span>
          </label>
          <input
            id="businessType"
            type="text"
            value={businessType}
            onChange={(e) => {
              setBusinessType(e.target.value);
              if (touched.businessType) {
                if (!e.target.value.trim()) {
                  setErrors(prev => ({ ...prev, businessType: 'Business type is required' }));
                } else {
                  setErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.businessType;
                    return newErrors;
                  });
                }
              }
            }}
            onBlur={() => setTouched(prev => ({ ...prev, businessType: true }))}
            placeholder="plumber, electrician, lawyer..."
            className={`w-full px-4 py-3 border rounded-xl bg-white dark:bg-neutral-800/80 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-sky-400/70 focus:outline-none focus:ring-2 focus:border-transparent transition-all shadow-sm ${
              touched.businessType && errors.businessType
                ? 'border-red-500 focus:ring-red-500'
                : 'border-zinc-300 dark:border-sky-700/40 focus:ring-sky-500'
            }`}
            disabled={loading}
            required
          />
          {touched.businessType && errors.businessType && (
            <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.businessType}</p>
          )}
        </div>

        {/* Company descriptions (saved + from other campaigns, deduped) */}
        {mergedDescriptions.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-sky-200 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Company descriptions
            </h3>
            <p className="text-xs text-zinc-500 dark:text-sky-200">
              Click to reuse. From saved descriptions and other campaigns. New ones are saved when you launch a campaign.
            </p>
            <div className="flex flex-wrap gap-2">
              {mergedDescriptions.map((desc, idx) => (
                <div
                  key={desc.id ?? `campaign-${idx}-${desc.content.slice(0, 20)}`}
                  className="group flex items-center gap-2 bg-zinc-100 dark:bg-neutral-800 border border-zinc-300 dark:border-sky-700/40 rounded-lg px-3 py-2 max-w-full"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setCompanyDescription(desc.content);
                      setTouched((prev) => ({ ...prev, companyDescription: true }));
                    }}
                    className="flex-1 text-left text-sm text-zinc-800 dark:text-sky-100 hover:text-zinc-900 dark:hover:text-white min-w-0"
                    title={desc.content}
                  >
                    <span className="font-medium text-zinc-800 dark:text-sky-100">{desc.displayName}</span>
                  </button>
                  {desc.id && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/company-descriptions/${desc.id}`, {
                            method: 'DELETE',
                          });
                          if (res.ok) {
                            fetchAllDescriptions();
                          }
                        } catch {
                          // Ignore
                        }
                      }}
                    className="p-1 text-zinc-500 dark:text-sky-400/90 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <label
            htmlFor="companyDescription"
            className="block text-sm font-semibold text-zinc-700 dark:text-sky-200 mb-2"
          >
            Company Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="companyDescription"
            value={companyDescription}
            onChange={(e) => {
              setCompanyDescription(e.target.value);
              if (touched.companyDescription) {
                const desc = e.target.value.trim();
                if (desc.length < 50) {
                  setErrors(prev => ({ ...prev, companyDescription: 'Description must be at least 50 characters' }));
                } else if (desc.length > 500) {
                  setErrors(prev => ({ ...prev, companyDescription: 'Description cannot exceed 500 characters' }));
                } else {
                  setErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.companyDescription;
                    return newErrors;
                  });
                }
              }
            }}
            onBlur={() => setTouched(prev => ({ ...prev, companyDescription: true }))}
            placeholder="Ex: We're a family-owned plumbing company with 15 years of experience in NYC. We specialize in emergency repairs, plumbing solutions, and offer 24/7 service with transparent pricing."
            rows={4}
            className={`w-full px-4 py-3 border rounded-xl bg-white dark:bg-neutral-800/80 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-sky-400/70 focus:outline-none focus:ring-2 focus:border-transparent transition-all shadow-sm resize-none ${
              touched.companyDescription && errors.companyDescription
                ? 'border-red-500 focus:ring-red-500'
                : touched.companyDescription && companyDescription.trim().length >= 50 && companyDescription.trim().length <= 500
                ? 'border-sky-500 focus:ring-sky-500'
                : 'border-zinc-300 dark:border-sky-700/40 focus:ring-sky-500'
            }`}
            disabled={loading}
            required
          />
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-zinc-500 dark:text-sky-400/90">
              This description will be used to personalize your emails automatically. Be specific about your services, experience, and what sets you apart.
            </p>
            <span
              className={`text-xs font-medium ${
                companyDescription.trim().length < 50
                  ? 'text-red-500 dark:text-red-400'
                  : companyDescription.trim().length <= 500
                  ? 'text-sky-600 dark:text-sky-400'
                  : 'text-orange-500 dark:text-orange-400'
              }`}
            >
              {companyDescription.trim().length} / 500 characters (min. 50)
            </span>
          </div>
          {touched.companyDescription && errors.companyDescription && (
            <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.companyDescription}</p>
          )}
        </div>

        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mt-6 mb-4">
          Email Personalization
        </h3>

        <div>
          <label
            htmlFor="toneOfVoice"
            className="block text-sm font-semibold text-zinc-700 dark:text-sky-200 mb-2"
          >
            Tone of Voice <span className="text-red-500">*</span>
          </label>
          <select
            id="toneOfVoice"
            value={toneOfVoice}
            onChange={(e) => setToneOfVoice(e.target.value)}
            className="w-full px-4 py-3 border border-zinc-300 dark:border-sky-700/40 rounded-xl bg-white dark:bg-neutral-800/80 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all shadow-sm"
            disabled={loading}
            required
          >
            <option value="professional">Professional</option>
            <option value="casual">Casual / Friendly</option>
            <option value="direct">Direct / Bold</option>
            <option value="empathetic">Empathetic / Understanding</option>
          </select>
          <p className="text-xs text-zinc-500 dark:text-sky-400/90 mt-1">
            The writing style of your automated emails.
          </p>
        </div>

        <div>
          <label
            htmlFor="campaignGoal"
            className="block text-sm font-semibold text-zinc-700 dark:text-sky-200 mb-2"
          >
            Campaign Goal <span className="text-red-500">*</span>
          </label>
          <select
            id="campaignGoal"
            value={campaignGoal}
            onChange={(e) => setCampaignGoal(e.target.value)}
            className="w-full px-4 py-3 border border-zinc-300 dark:border-sky-700/40 rounded-xl bg-white dark:bg-neutral-800/80 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all shadow-sm"
            disabled={loading}
            required
          >
            <option value="book_call">Book a phone call</option>
            <option value="free_audit">Offer a free audit/quote</option>
            <option value="send_brochure">Send a brochure/portfolio</option>
          </select>
          <p className="text-xs text-zinc-500 dark:text-sky-400/90 mt-1">
            What you want the prospect to do after reading the email.
          </p>
        </div>

        {/* Example email (optional) - AI will use as inspiration */}
        <div>
          <label
            htmlFor="exampleEmail"
            className="block text-sm font-semibold text-zinc-700 dark:text-sky-200 mb-2 flex items-center gap-2"
          >
            <Mail className="w-4 h-4" />
            Example email <span className="text-zinc-500 dark:text-sky-400/90 text-xs">(optional)</span>
          </label>
          <p className="text-xs text-zinc-500 dark:text-sky-400/90 mb-2">
            Paste an email you like so the AI can match its style and structure. Saved templates can be reused below.
          </p>
          {emailTemplates.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {emailTemplates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="group flex items-center gap-2 bg-zinc-100 dark:bg-neutral-800/80/50 border border-zinc-300 dark:border-sky-700/40 rounded-lg px-3 py-2"
                >
                  <button
                    type="button"
                    onClick={() => setExampleEmail(tpl.content)}
                    className="text-sm text-zinc-700 dark:text-sky-200 hover:text-zinc-900 dark:hover:text-white min-w-0"
                    title={tpl.content.slice(0, 100)}
                  >
                    {tpl.name?.trim() || 'Template'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/email-templates/${tpl.id}`, { method: 'DELETE' });
                        if (res.ok) fetchAllDescriptions();
                      } catch {
                        // Ignore
                      }
                    }}
                    className="p-1 text-zinc-500 dark:text-sky-400/90 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete template"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <textarea
            id="exampleEmail"
            value={exampleEmail}
            onChange={(e) => setExampleEmail(e.target.value)}
            placeholder="Hi [first_name], I came across [company] and thought your work in [industry] was a great fit. Would you be open to a quick call next week? (paste your example here)"
            rows={4}
            className="w-full px-4 py-3 border border-zinc-300 dark:border-sky-700/40 rounded-xl bg-white dark:bg-neutral-800/80 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-sky-400/70 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all shadow-sm resize-none"
            disabled={loading}
          />
        </div>

        <div>
          <label
            htmlFor="magicLink"
            className="block text-sm font-semibold text-zinc-700 dark:text-sky-200 mb-2"
          >
            Link to Include <span className="text-zinc-500 dark:text-sky-400/90 text-xs">(optional)</span>
          </label>
          <input
            id="magicLink"
            type="url"
            value={magicLink}
            onChange={(e) => {
              setMagicLink(e.target.value);
              if (touched.magicLink) {
                if (!isValidUrl(e.target.value)) {
                  setErrors(prev => ({ ...prev, magicLink: 'URL must start with http:// or https://' }));
                } else {
                  setErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.magicLink;
                    return newErrors;
                  });
                }
              }
            }}
            onBlur={() => setTouched(prev => ({ ...prev, magicLink: true }))}
            placeholder="https://your-site.com/portfolio or https://calendly.com/..."
            className={`w-full px-4 py-3 border rounded-xl bg-white dark:bg-neutral-800/80 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-sky-400/70 focus:outline-none focus:ring-2 focus:border-transparent transition-all shadow-sm ${
              touched.magicLink && errors.magicLink
                ? 'border-red-500 focus:ring-red-500'
                : touched.magicLink && magicLink.trim() && isValidUrl(magicLink)
                ? 'border-sky-500 focus:ring-sky-500'
                : 'border-zinc-300 dark:border-sky-700/40 focus:ring-sky-500'
            }`}
            disabled={loading}
          />
          <p className="text-xs text-zinc-500 dark:text-sky-400/90 mt-1">
            Website, Instagram, Calendly... AI will naturally integrate this link into the email.
          </p>
          {touched.magicLink && errors.magicLink && (
            <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.magicLink}</p>
          )}
        </div>

        {!drawnCityCountry && (
          <div>
            <label
              htmlFor="cities"
              className="block text-sm font-semibold text-zinc-700 dark:text-sky-200 mb-2"
            >
              Target City <span className="text-zinc-500 dark:text-sky-400/90 text-xs">(optional)</span>
            </label>
            <input
              id="cities"
              type="text"
              value={cities}
              onChange={(e) => {
                setCities(e.target.value);
                setDrawnCityCountry(null);
              }}
              placeholder="New York, Los Angeles, Chicago..."
              className="w-full px-4 py-3 border border-zinc-300 dark:border-sky-700/40 rounded-xl bg-white dark:bg-neutral-800/80 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-sky-400/70 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all shadow-sm"
              disabled={loading}
            />
            <p className="text-xs text-zinc-500 dark:text-sky-400/90 mt-1">
              Separate cities with commas
            </p>
          </div>
        )}

        <div className="space-y-4">
          <p className="text-sm font-medium text-zinc-500 dark:text-sky-400/90 text-center">Or</p>

          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Random City Draw</h3>
          <p className="text-xs text-zinc-500 dark:text-sky-400/90 -mt-1 mb-2">
            Before launching the campaign, draw a random city and country to target this area.
          </p>

          <div>
            <label
              htmlFor="citySize"
              className="block text-sm font-semibold text-zinc-700 dark:text-sky-200 mb-2"
            >
              Target City Size
            </label>
            <select
              id="citySize"
              value={citySize}
              onChange={(e) => setCitySize(e.target.value)}
              className="w-full px-4 py-3 border border-zinc-300 dark:border-sky-700/40 rounded-xl bg-white dark:bg-neutral-800/80 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all shadow-sm"
              disabled={loading || generating}
            >
              <option value="1M+">Over 1 million inhabitants (17 cities)</option>
              <option value="500K-1M">Between 500k and 1M inhabitants (20 cities)</option>
              <option value="500K+">Over 500k inhabitants (37 cities)</option>
              <option value="250K-500K">Between 250k and 500k inhabitants (38 cities)</option>
              <option value="250K+">Over 250k inhabitants (75 cities)</option>
              <option value="100K-250K">Between 100k and 250k inhabitants (102 cities)</option>
              <option value="100K+">Over 100k inhabitants (177 cities)</option>
              <option value="50K-100K">Between 50k and 100k inhabitants (151 cities)</option>
              <option value="all">All cities (328 cities)</option>
            </select>
            <p className="text-xs text-zinc-500 dark:text-sky-400/90 mt-1">
              Target cities by population size. Leave the field above empty to use this filter.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-300 dark:border-sky-700/40 bg-zinc-50 dark:bg-neutral-800/60 p-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                const drawn = drawRandomCityCountry(citySize);
                setDrawnCityCountry(drawn);
                setCities(drawn.city);
                }}
                disabled={loading || generating}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 dark:bg-sky-700/80 dark:hover:bg-sky-600 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-sky-500/50 dark:border-sky-600/50"
              >
                <Shuffle className="w-4 h-4" />
                Draw a city and a country
              </button>
              {drawnCityCountry && (
                <p className="text-sm text-zinc-600 dark:text-sky-200 font-medium">
                  Drawn city: <span className="text-zinc-900 dark:text-white font-semibold">{drawnCityCountry.city}</span> ({drawnCityCountry.country})
                </p>
              )}
          </div>
        </div>

        {generating && (
          <div className="flex flex-col gap-3 p-4 rounded-xl bg-zinc-50 dark:bg-neutral-800/80/20 border border-zinc-200 dark:border-sky-700/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-sky-500 dark:text-sky-400/90 animate-spin flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-zinc-700 dark:text-sky-300">🔄 Generation in progress...</p>
                  <p className="text-xs text-zinc-500 dark:text-sky-400/90 mt-1">
                    Progress: {currentCount} / {targetCount} leads | Attempt {attempts} / 10
                  </p>
                  {pollingStatus && (
                    <p className="text-xs text-zinc-600 dark:text-sky-300 mt-1 flex items-center gap-1">
                      {pollingStatus.includes('✨') ? (
                        <Sparkles className="w-3 h-3" />
                      ) : pollingStatus.includes('⏳') ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : null}
                      {pollingStatus}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCancel}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg border border-red-300 dark:border-red-800/50 hover:border-red-400 dark:hover:border-red-700 transition-colors"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
            <div className="w-full bg-zinc-200 dark:bg-neutral-800/80/50 rounded-full h-2 overflow-hidden">
              <div
                className="bg-sky-500 h-full transition-all duration-300"
                style={{ width: `${Math.min((currentCount / targetCount) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

        {loading && !generating && !showRefreshMessage && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-50 dark:bg-neutral-800/80/20 border border-zinc-200 dark:border-sky-700/40">
            <Loader2 className="w-5 h-5 text-sky-500 dark:text-sky-400/90 animate-spin flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-zinc-700 dark:text-sky-300">Launching campaign...</p>
              <p className="text-xs text-zinc-500 dark:text-sky-400/90 mt-1">This may take a few moments</p>
            </div>
          </div>
        )}

        {showRefreshMessage && message && (
          <div
            className={`flex items-center gap-2 p-3 rounded-xl ${
              message.type === 'success'
                ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800'
                : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
            }`}
          >
            {message.type === 'success' ? (
              <RefreshCw className="w-5 h-5 flex-shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        {!loading && !showRefreshMessage && message && message.type === 'error' && (
          <div
            className={`flex items-center gap-2 p-3 rounded-xl bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800`}
          >
            <XCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        <div>
          <label
            htmlFor="targetCount"
            className="block text-sm font-semibold text-zinc-700 dark:text-sky-200 mb-2"
          >
            Number of Leads to Generate <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-4">
            <input
              id="targetCount"
              type="range"
              min="1"
              max={MAX_PER_CAMPAIGN}
              value={targetCount}
              onChange={(e) => setTargetCount(parseInt(e.target.value, 10))}
              className="flex-1 h-2 bg-zinc-200 dark:bg-neutral-800/80 rounded-lg appearance-none cursor-pointer accent-sky-600"
              disabled={loading || generating}
            />
            <input
              type="number"
              min="1"
              max={MAX_PER_CAMPAIGN}
              value={targetCount}
              onChange={(e) => {
                const value = parseInt(e.target.value, 10);
                if (!isNaN(value) && value >= 1 && value <= MAX_PER_CAMPAIGN) {
                  setTargetCount(value);
                }
              }}
              className="w-20 px-3 py-2 border border-zinc-300 dark:border-sky-700/40 rounded-xl bg-white dark:bg-neutral-800/80 text-zinc-900 dark:text-white text-center focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
              disabled={loading || generating}
              required
            />
          </div>
          <div className="mt-2">
            <p className="text-xs text-zinc-500 dark:text-sky-400/90">
              Max {MAX_PER_CAMPAIGN} leads per campaign.
            </p>
            <p className="text-xs text-zinc-600 dark:text-sky-300 mt-1">
              This campaign: <span className="font-semibold">{todayLeadsCount}/{targetCount}</span>
              {todayLeadsCount < targetCount && (
                <span className="ml-2">({targetCount - todayLeadsCount} remaining)</span>
              )}
            </p>
          </div>
          {errors.targetCount && (
            <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.targetCount}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || generating || !isFormValid()}
          className="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 dark:bg-sky-700 dark:hover:bg-sky-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
        >
          {generating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Generating Leads...</span>
            </>
          ) : loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Launching...</span>
            </>
          ) : (
            <span>Launch Campaign</span>
          )}
        </button>
      </form>
    </div>
  );
}
