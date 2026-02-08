import { createServerSupabaseClient } from './supabase-server';

export interface CompanyDescription {
  id: string;
  content: string;
  campaignName?: string;
  createdAt: string;
}

export async function getCompanyDescriptions(userId: string): Promise<CompanyDescription[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('company_descriptions')
    .select('id, content, campaign_name, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map((r) => ({
    id: r.id,
    content: r.content,
    campaignName: r.campaign_name ?? undefined,
    createdAt: r.created_at,
  }));
}

export async function addCompanyDescription(
  userId: string,
  content: string,
  campaignName?: string
): Promise<CompanyDescription | null> {
  const trimmed = content.trim();
  if (!trimmed || trimmed.length < 50) return null;

  const supabase = await createServerSupabaseClient();

  // Check if exact same content already exists
  const { data: existing } = await supabase
    .from('company_descriptions')
    .select('id, content, created_at')
    .eq('user_id', userId)
    .eq('content', trimmed)
    .maybeSingle();

  if (existing) return null; // Already saved

  const { data, error } = await supabase
    .from('company_descriptions')
    .insert({ user_id: userId, content: trimmed, campaign_name: campaignName?.trim() || null })
    .select('id, content, campaign_name, created_at')
    .single();

  if (error) throw error;
  return {
    id: data.id,
    content: data.content,
    campaignName: data.campaign_name ?? undefined,
    createdAt: data.created_at,
  };
}

export async function deleteCompanyDescription(
  userId: string,
  id: string
): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('company_descriptions')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  return !error;
}
