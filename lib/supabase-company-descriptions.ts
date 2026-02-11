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

function normalizeContent(content: string): string {
  return content.trim().replace(/\s+/g, ' ');
}

export async function addCompanyDescription(
  userId: string,
  content: string,
  campaignName?: string
): Promise<CompanyDescription | null> {
  const trimmed = content.trim();
  if (!trimmed || trimmed.length < 50) return null;

  const supabase = await createServerSupabaseClient();
  const normalizedNew = normalizeContent(trimmed);

  // Fetch all user descriptions and check for duplicate (same normalized content)
  const { data: existingList } = await supabase
    .from('company_descriptions')
    .select('id, content')
    .eq('user_id', userId);

  const isDuplicate = (existingList || []).some(
    (row) => normalizeContent(row.content) === normalizedNew
  );
  if (isDuplicate) return null;

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

export async function updateCompanyDescription(
  userId: string,
  id: string,
  updates: { content?: string; campaignName?: string }
): Promise<CompanyDescription | null> {
  const supabase = await createServerSupabaseClient();
  const payload: Record<string, unknown> = {};
  if (updates.content !== undefined) {
    const trimmed = updates.content.trim();
    if (trimmed.length < 50) return null;
    const normalizedNew = normalizeContent(trimmed);
    const { data: others } = await supabase
      .from('company_descriptions')
      .select('id, content')
      .eq('user_id', userId)
      .neq('id', id);
    const isDuplicate = (others || []).some(
      (row) => normalizeContent(row.content) === normalizedNew
    );
    if (isDuplicate) return null;
    payload.content = trimmed;
  }
  if (updates.campaignName !== undefined) {
    payload.campaign_name = updates.campaignName.trim() || null;
  }
  if (Object.keys(payload).length === 0) return null;

  const { data, error } = await supabase
    .from('company_descriptions')
    .update(payload)
    .eq('id', id)
    .eq('user_id', userId)
    .select('id, content, campaign_name, created_at')
    .single();

  if (error || !data) return null;
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
