import { createServerSupabaseClient, createAdminClient } from './supabase-server';

export interface ScheduleData {
  launchTime: string | null;
  campaignIds: string[];
}

export async function getSchedule(userId: string): Promise<ScheduleData> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('user_schedule')
    .select('launch_time, campaign_ids')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return { launchTime: null, campaignIds: [] };
  }
  const ids = data.campaign_ids;
  return {
    launchTime: data.launch_time ?? null,
    campaignIds: Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [],
  };
}

export async function setSchedule(
  userId: string,
  launchTime: string,
  campaignIds?: string[]
): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const payload: { user_id: string; launch_time: string; updated_at: string; campaign_ids?: string[] } = {
    user_id: userId,
    launch_time: launchTime,
    updated_at: new Date().toISOString(),
  };
  if (campaignIds !== undefined) {
    payload.campaign_ids = campaignIds;
  }
  await supabase.from('user_schedule').upsert(payload, { onConflict: 'user_id' });
}

/** Get all user_ids whose schedule matches current HH:MM (for cron) */
export async function getUsersWithScheduleMatchingNow(): Promise<string[]> {
  const admin = createAdminClient();
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const currentTime = `${hh}:${mm}`;

  const { data, error } = await admin
    .from('user_schedule')
    .select('user_id')
    .eq('launch_time', currentTime);

  if (error || !data) return [];
  return data.map((r: { user_id: string }) => r.user_id);
}

/** Get scheduled campaign IDs for a user (for cron). Returns empty array if none set = launch all. */
export async function getScheduleCampaignIdsAdmin(userId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('user_schedule')
    .select('campaign_ids')
    .eq('user_id', userId)
    .single();

  if (error || !data || !data.campaign_ids) return [];
  const ids = data.campaign_ids;
  return Array.isArray(ids) ? ids.filter((id: unknown): id is string => typeof id === 'string') : [];
}
