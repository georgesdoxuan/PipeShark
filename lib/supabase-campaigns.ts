import { createServerSupabaseClient, createAdminClient } from './supabase-server';

export type CampaignMode = 'standard' | 'local_businesses';

export interface Campaign {
  id: string;
  name?: string;
  businessType: string;
  companyDescription?: string;
  toneOfVoice?: string;
  campaignGoal?: string;
  magicLink?: string;
  cities?: string[];
  citySize?: string;
  mode?: CampaignMode;
  numberCreditsUsed?: number;
  createdAt: string;
  status: 'active' | 'completed';
}

interface CreateCampaignInput {
  name?: string;
  businessType: string;
  companyDescription?: string;
  toneOfVoice?: string;
  campaignGoal?: string;
  magicLink?: string;
  cities?: string[];
  citySize?: string;
  mode?: CampaignMode;
  numberCreditsUsed?: number;
  status?: 'active' | 'completed';
}

function mapRecordToCampaign(record: any): Campaign {
  return {
    id: record.id,
    name: record.name ?? undefined,
    businessType: record.business_type,
    companyDescription: record.company_description,
    toneOfVoice: record.tone_of_voice,
    campaignGoal: record.campaign_goal,
    magicLink: record.magic_link,
    cities: record.cities || undefined,
    citySize: record.city_size,
    mode: (record.mode === 'local_businesses' ? 'local_businesses' : 'standard') as CampaignMode,
    numberCreditsUsed: record.number_credits_used ?? 0,
    createdAt: record.created_at,
    status: record.status || 'active',
  };
}

export async function createCampaign(userId: string, input: CreateCampaignInput): Promise<Campaign> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      user_id: userId,
      name: input.name?.trim() || null,
      business_type: input.businessType,
      company_description: input.companyDescription,
      tone_of_voice: input.toneOfVoice || 'professional',
      campaign_goal: input.campaignGoal || 'book_call',
      magic_link: input.magicLink,
      cities: input.cities || null,
      city_size: input.citySize || '1M+',
      mode: input.mode || 'standard',
      number_credits_used: input.numberCreditsUsed ?? 0,
      status: input.status || 'active',
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return mapRecordToCampaign(data);
}

export async function getCampaignsForUser(userId: string): Promise<Campaign[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).map(mapRecordToCampaign);
}

export async function getCampaignById(userId: string, campaignId: string): Promise<Campaign | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return mapRecordToCampaign(data);
}

/**
 * Sum of number_credits_used for all campaigns created today by the user.
 * Used for Daily Credits (X/20).
 */
export async function sumTodayCreditsUsedForUser(userId: string): Promise<number> {
  const supabase = await createServerSupabaseClient();

  const today = new Date().toISOString().split('T')[0];
  const startOfDay = `${today}T00:00:00.000Z`;
  const endOfDay = `${today}T23:59:59.999Z`;

  const { data, error } = await supabase
    .from('campaigns')
    .select('number_credits_used')
    .eq('user_id', userId)
    .gte('created_at', startOfDay)
    .lte('created_at', endOfDay);

  if (error) {
    throw error;
  }

  const sum = (data || []).reduce((acc, row) => acc + (row.number_credits_used ?? 0), 0);
  return sum;
}

export async function updateCampaign(
  userId: string,
  campaignId: string,
  updates: Partial<{
    name: string;
    companyDescription: string;
    toneOfVoice: string;
    campaignGoal: string;
    magicLink: string;
    cities: string[];
    citySize: string;
    mode: CampaignMode;
  }>
): Promise<Campaign | null> {
  const supabase = await createServerSupabaseClient();

  const payload: Record<string, unknown> = {};
  if (updates.name !== undefined) payload.name = updates.name?.trim() || null;
  if (updates.companyDescription !== undefined) payload.company_description = updates.companyDescription;
  if (updates.toneOfVoice !== undefined) payload.tone_of_voice = updates.toneOfVoice;
  if (updates.campaignGoal !== undefined) payload.campaign_goal = updates.campaignGoal;
  if (updates.magicLink !== undefined) payload.magic_link = updates.magicLink;
  if (updates.cities !== undefined) payload.cities = updates.cities;
  if (updates.citySize !== undefined) payload.city_size = updates.citySize;
  if (updates.mode !== undefined) payload.mode = updates.mode;

  if (Object.keys(payload).length === 0) {
    return getCampaignById(userId, campaignId);
  }

  const { data, error } = await supabase
    .from('campaigns')
    .update(payload)
    .eq('id', campaignId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error || !data) return null;
  return mapRecordToCampaign(data);
}

export async function getCampaignsForUserAdmin(userId: string): Promise<Campaign[]> {
  const { createAdminClient } = await import('./supabase-server');
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('campaigns')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapRecordToCampaign);
}

/** Get campaigns by IDs for a user (for cron). Order matches ids order. */
export async function getCampaignsByIdsAdmin(userId: string, campaignIds: string[]): Promise<Campaign[]> {
  if (campaignIds.length === 0) return [];
  const { createAdminClient } = await import('./supabase-server');
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('campaigns')
    .select('*')
    .eq('user_id', userId)
    .in('id', campaignIds)
    .eq('status', 'active');

  if (error) throw error;
  const campaigns = (data || []).map(mapRecordToCampaign);
  const byId = new Map(campaigns.map((c) => [c.id, c]));
  return campaignIds.map((id) => byId.get(id)).filter((c): c is Campaign => c != null);
}

export async function sumTodayCreditsUsedForUserAdmin(userId: string): Promise<number> {
  const { createAdminClient } = await import('./supabase-server');
  const admin = createAdminClient();

  const today = new Date().toISOString().split('T')[0];
  const startOfDay = `${today}T00:00:00.000Z`;
  const endOfDay = `${today}T23:59:59.999Z`;

  const { data, error } = await admin
    .from('campaigns')
    .select('number_credits_used')
    .eq('user_id', userId)
    .gte('created_at', startOfDay)
    .lte('created_at', endOfDay);

  if (error) throw error;
  return (data || []).reduce((acc, row) => acc + (row.number_credits_used ?? 0), 0);
}

export async function deleteCampaign(userId: string, campaignId: string): Promise<boolean> {
  const admin = createAdminClient();
  // Unlink leads first so FK doesn't block (or use ON DELETE SET NULL; we clear anyway for consistency)
  await admin.from('leads').update({ campaign_id: null }).eq('campaign_id', campaignId).eq('user_id', userId);
  const { error } = await admin
    .from('campaigns')
    .delete()
    .eq('id', campaignId)
    .eq('user_id', userId);
  return !error;
}
