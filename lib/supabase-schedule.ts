import { createServerSupabaseClient, createAdminClient } from './supabase-server';

export async function getSchedule(userId: string): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('user_schedule')
    .select('launch_time')
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  return data.launch_time;
}

export async function setSchedule(userId: string, launchTime: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase
    .from('user_schedule')
    .upsert(
      { user_id: userId, launch_time: launchTime, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
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
