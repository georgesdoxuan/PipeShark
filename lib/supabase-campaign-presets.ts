import { createServerSupabaseClient } from './supabase-server';

export interface CampaignPreset {
  id: string;
  name: string;
  businessType?: string;
  companyDescription?: string;
  toneOfVoice?: string;
  campaignGoal?: string;
  magicLink?: string;
  citySize?: string;
  cities?: string[];
  businessLinkText?: string;
  emailMaxLength?: number;
  exampleEmail?: string;
  aiInstructions?: string;
  createdAt: string;
  updatedAt: string;
}

function mapPreset(record: Record<string, unknown>): CampaignPreset {
  return {
    id: record.id as string,
    name: record.name as string,
    businessType: (record.business_type as string | undefined) ?? undefined,
    companyDescription: (record.company_description as string | undefined) ?? undefined,
    toneOfVoice: (record.tone_of_voice as string | undefined) ?? undefined,
    campaignGoal: (record.campaign_goal as string | undefined) ?? undefined,
    magicLink: (record.magic_link as string | undefined) ?? undefined,
    citySize: (record.city_size as string | undefined) ?? undefined,
    cities: (record.cities as string[] | undefined) ?? undefined,
    businessLinkText: (record.business_link_text as string | undefined) ?? undefined,
    emailMaxLength: (record.email_max_length as number | undefined) ?? undefined,
    exampleEmail: (record.example_email as string | undefined) ?? undefined,
    aiInstructions: (record.ai_instructions as string | undefined) ?? undefined,
    createdAt: record.created_at as string,
    updatedAt: record.updated_at as string,
  };
}

export async function getPresetsForUser(userId: string): Promise<CampaignPreset[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('campaign_presets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((r) => mapPreset(r as Record<string, unknown>));
}

export async function createPreset(
  userId: string,
  input: Omit<CampaignPreset, 'id' | 'createdAt' | 'updatedAt'>
): Promise<CampaignPreset> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('campaign_presets')
    .insert({
      user_id: userId,
      name: input.name.trim(),
      business_type: input.businessType ?? null,
      company_description: input.companyDescription ?? null,
      tone_of_voice: input.toneOfVoice ?? null,
      campaign_goal: input.campaignGoal ?? null,
      magic_link: input.magicLink ?? null,
      city_size: input.citySize ?? null,
      cities: input.cities && input.cities.length > 0 ? input.cities : null,
      business_link_text: input.businessLinkText ?? null,
      email_max_length: input.emailMaxLength ?? 150,
      example_email: input.exampleEmail ?? null,
      ai_instructions: input.aiInstructions ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return mapPreset(data as Record<string, unknown>);
}

export async function updatePreset(
  userId: string,
  presetId: string,
  updates: Partial<Omit<CampaignPreset, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<CampaignPreset | null> {
  const supabase = await createServerSupabaseClient();
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) payload.name = updates.name.trim();
  if (updates.businessType !== undefined) payload.business_type = updates.businessType;
  if (updates.companyDescription !== undefined) payload.company_description = updates.companyDescription;
  if (updates.toneOfVoice !== undefined) payload.tone_of_voice = updates.toneOfVoice;
  if (updates.campaignGoal !== undefined) payload.campaign_goal = updates.campaignGoal;
  if (updates.magicLink !== undefined) payload.magic_link = updates.magicLink;
  if (updates.citySize !== undefined) payload.city_size = updates.citySize;
  if (updates.cities !== undefined) payload.cities = updates.cities.length > 0 ? updates.cities : null;
  if (updates.businessLinkText !== undefined) payload.business_link_text = updates.businessLinkText;
  if (updates.emailMaxLength !== undefined) payload.email_max_length = updates.emailMaxLength;
  if (updates.exampleEmail !== undefined) payload.example_email = updates.exampleEmail;
  if (updates.aiInstructions !== undefined) payload.ai_instructions = updates.aiInstructions;

  const { data, error } = await supabase
    .from('campaign_presets')
    .update(payload)
    .eq('id', presetId)
    .eq('user_id', userId)
    .select()
    .single();
  if (error || !data) return null;
  return mapPreset(data as Record<string, unknown>);
}

export async function deletePreset(userId: string, presetId: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('campaign_presets')
    .delete()
    .eq('id', presetId)
    .eq('user_id', userId);
  return !error;
}
