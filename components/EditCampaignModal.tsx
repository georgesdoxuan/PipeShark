'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

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

interface EditCampaignModalProps {
  campaign: Campaign;
  onClose: () => void;
  onSave: (updates: {
    name?: string;
    companyDescription?: string;
    toneOfVoice?: string;
    campaignGoal?: string;
    magicLink?: string;
    cities?: string[];
    citySize?: string;
  }) => Promise<void>;
  saving: boolean;
}

function isValidUrl(url: string): boolean {
  if (!url.trim()) return true;
  return url.trim().startsWith('http://') || url.trim().startsWith('https://');
}

export default function EditCampaignModal({
  campaign,
  onClose,
  onSave,
  saving,
}: EditCampaignModalProps) {
  const [campaignName, setCampaignName] = useState(campaign.name || '');
  const [companyDescription, setCompanyDescription] = useState(
    campaign.companyDescription || ''
  );
  const [toneOfVoice, setToneOfVoice] = useState(
    campaign.toneOfVoice || 'professional'
  );
  const [campaignGoal, setCampaignGoal] = useState(
    campaign.campaignGoal || 'book_call'
  );
  const [magicLink, setMagicLink] = useState(campaign.magicLink || '');
  const [citiesInput, setCitiesInput] = useState(
    campaign.cities?.join(', ') || ''
  );
  const [citySize, setCitySize] = useState(campaign.citySize || '1M+');
  const [errors, setErrors] = useState<{
    companyDescription?: string;
    magicLink?: string;
  }>({});

  useEffect(() => {
    setCampaignName(campaign.name || '');
    setCompanyDescription(campaign.companyDescription || '');
    setToneOfVoice(campaign.toneOfVoice || 'professional');
    setCampaignGoal(campaign.campaignGoal || 'book_call');
    setMagicLink(campaign.magicLink || '');
    setCitiesInput(campaign.cities?.join(', ') || '');
    setCitySize(campaign.citySize || '1M+');
  }, [campaign]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: typeof errors = {};
    const descTrimmed = companyDescription.trim();
    if (!descTrimmed || descTrimmed.length < 50) {
      newErrors.companyDescription = 'Description must be at least 50 characters';
    } else if (descTrimmed.length > 500) {
      newErrors.companyDescription = 'Description cannot exceed 500 characters';
    }
    if (!isValidUrl(magicLink)) {
      newErrors.magicLink = 'URL must start with http:// or https://';
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const citiesArray = citiesInput
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    const updates: Parameters<typeof onSave>[0] = {
      name: campaignName.trim() || undefined,
      companyDescription: descTrimmed,
      toneOfVoice,
      campaignGoal,
      magicLink: magicLink.trim(),
      citySize,
    };
    if (citiesArray.length > 0) {
      updates.cities = citiesArray;
    } else {
      updates.cities = [];
    }

    await onSave(updates);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-neutral-900 rounded-xl border border-sky-800/40 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-sky-800/40">
          <h2 className="text-xl font-display font-bold text-white">
            Edit campaign for next run
          </h2>
          <button
            onClick={onClose}
            disabled={saving}
            className="text-sky-400/90 hover:text-sky-300 transition-colors p-1 rounded-lg hover:bg-neutral-800 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
          <div>
            <label
              htmlFor="edit-campaignName"
              className="block text-sm font-semibold text-sky-200 mb-2"
            >
              Campaign Name <span className="text-sky-400/90 text-xs">(optional)</span>
            </label>
            <input
              id="edit-campaignName"
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              className="w-full px-4 py-3 border border-sky-700/40 rounded-xl bg-neutral-800/80 text-white placeholder-sky-400/70 focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="e.g. Plumbers NYC"
              disabled={saving}
            />
          </div>

          <div>
            <label
              htmlFor="edit-companyDescription"
              className="block text-sm font-semibold text-sky-200 mb-2"
            >
              Company Description <span className="text-red-400">*</span>
            </label>
            <textarea
              id="edit-companyDescription"
              value={companyDescription}
              onChange={(e) => setCompanyDescription(e.target.value)}
              rows={4}
              className={`w-full px-4 py-3 border rounded-xl bg-neutral-800/80 text-white placeholder-sky-400/70 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none ${
                errors.companyDescription ? 'border-red-500' : 'border-sky-700/40'
              }`}
              placeholder="Describe your company (50-500 characters)"
              disabled={saving}
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-sky-400/90">
                {companyDescription.trim().length} / 500 (min 50)
              </span>
              {errors.companyDescription && (
                <span className="text-xs text-red-400">
                  {errors.companyDescription}
                </span>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="edit-toneOfVoice"
              className="block text-sm font-semibold text-sky-200 mb-2"
            >
              Tone of Voice
            </label>
            <select
              id="edit-toneOfVoice"
              value={toneOfVoice}
              onChange={(e) => setToneOfVoice(e.target.value)}
              className="w-full px-4 py-3 border border-sky-700/40 rounded-xl bg-neutral-800/80 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              disabled={saving}
            >
              <option value="professional">Professional</option>
              <option value="casual">Casual / Friendly</option>
              <option value="direct">Direct / Bold</option>
              <option value="empathetic">Empathetic / Understanding</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="edit-campaignGoal"
              className="block text-sm font-semibold text-sky-200 mb-2"
            >
              Campaign Goal
            </label>
            <select
              id="edit-campaignGoal"
              value={campaignGoal}
              onChange={(e) => setCampaignGoal(e.target.value)}
              className="w-full px-4 py-3 border border-sky-700/40 rounded-xl bg-neutral-800/80 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              disabled={saving}
            >
              <option value="book_call">Book a phone call</option>
              <option value="free_audit">Offer a free audit/quote</option>
              <option value="send_brochure">Send a brochure/portfolio</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="edit-magicLink"
              className="block text-sm font-semibold text-sky-200 mb-2"
            >
              Link to Include <span className="text-sky-400/90 text-xs">(optional)</span>
            </label>
            <input
              id="edit-magicLink"
              type="url"
              value={magicLink}
              onChange={(e) => setMagicLink(e.target.value)}
              className={`w-full px-4 py-3 border rounded-xl bg-neutral-800/80 text-white placeholder-sky-400/70 focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                errors.magicLink ? 'border-red-500' : 'border-sky-700/40'
              }`}
              placeholder="https://calendly.com/..."
              disabled={saving}
            />
            {errors.magicLink && (
              <p className="text-xs text-red-400 mt-1">{errors.magicLink}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="edit-cities"
              className="block text-sm font-semibold text-sky-200 mb-2"
            >
              Cities <span className="text-sky-400/90 text-xs">(optional, comma-separated)</span>
            </label>
            <input
              id="edit-cities"
              type="text"
              value={citiesInput}
              onChange={(e) => setCitiesInput(e.target.value)}
              className="w-full px-4 py-3 border border-sky-700/40 rounded-xl bg-neutral-800/80 text-white placeholder-sky-400/70 focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="Paris, Lyon, Marseille"
              disabled={saving}
            />
          </div>

          <div>
            <label
              htmlFor="edit-citySize"
              className="block text-sm font-semibold text-sky-200 mb-2"
            >
              City Size (used if no cities above)
            </label>
            <select
              id="edit-citySize"
              value={citySize}
              onChange={(e) => setCitySize(e.target.value)}
              className="w-full px-4 py-3 border border-sky-700/40 rounded-xl bg-neutral-800/80 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              disabled={saving}
            >
              <option value="1M+">Over 1 million inhabitants</option>
              <option value="500K-1M">Between 500k and 1M</option>
              <option value="500K+">Over 500k inhabitants</option>
              <option value="250K-500K">Between 250k and 500k</option>
              <option value="250K+">Over 250k inhabitants</option>
              <option value="100K-250K">Between 100k and 250k</option>
              <option value="100K+">Over 100k inhabitants</option>
              <option value="50K-100K">Between 50k and 100k</option>
              <option value="all">All cities</option>
            </select>
          </div>

          <div className="pt-6 border-t border-sky-800/40 flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-6 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-xl font-semibold transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-sky-700 hover:bg-sky-600 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                'Save for next run'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
