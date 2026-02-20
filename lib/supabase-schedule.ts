import { createServerSupabaseClient, createAdminClient } from './supabase-server';

export type LaunchDeliveryMode = 'drafts' | 'queue';

export interface ScheduleData {
  launchTime: string | null;
  campaignIds: string[];
  timezone: string | null;
  launchDeliveryMode: LaunchDeliveryMode;
}

function normalizeDeliveryMode(v: unknown): LaunchDeliveryMode {
  if (v === 'drafts' || v === 'queue') return v;
  return 'queue';
}

export async function getSchedule(userId: string): Promise<ScheduleData> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('user_schedule')
    .select('launch_time, campaign_ids, timezone, launch_delivery_mode')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return { launchTime: null, campaignIds: [], timezone: null, launchDeliveryMode: 'queue' };
  }
  const ids = data.campaign_ids;
  return {
    launchTime: data.launch_time ?? null,
    campaignIds: Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [],
    timezone: typeof data.timezone === 'string' ? data.timezone : null,
    launchDeliveryMode: normalizeDeliveryMode(data.launch_delivery_mode),
  };
}

export async function setSchedule(
  userId: string,
  launchTime: string,
  campaignIds?: string[],
  timezone?: string | null,
  launchDeliveryMode?: LaunchDeliveryMode
): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const payload: {
    user_id: string;
    launch_time: string;
    updated_at: string;
    campaign_ids?: string[];
    timezone?: string | null;
    launch_delivery_mode?: LaunchDeliveryMode;
  } = {
    user_id: userId,
    launch_time: launchTime,
    updated_at: new Date().toISOString(),
  };
  if (campaignIds !== undefined) {
    payload.campaign_ids = campaignIds;
  }
  if (timezone !== undefined) {
    payload.timezone = timezone || null;
  }
  if (launchDeliveryMode !== undefined) {
    payload.launch_delivery_mode = normalizeDeliveryMode(launchDeliveryMode);
  }
  await supabase.from('user_schedule').upsert(payload, { onConflict: 'user_id' });
}

/** Current HH:MM in a given IANA timezone (e.g. "Europe/Paris") */
function getCurrentTimeInTimezone(tz: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return formatter.format(new Date());
}

/** Get all user_ids whose schedule matches current time in their timezone (for cron). Optional simulateTime (HH:MM) for testing. */
export async function getUsersWithScheduleMatchingNow(simulateTime?: string | null): Promise<{ userIds: string[]; currentTimeUtc: string }> {
  const admin = createAdminClient();
  const now = new Date();
  const hh = String(now.getUTCHours()).padStart(2, '0');
  const mm = String(now.getUTCMinutes()).padStart(2, '0');
  const realTimeUtc = `${hh}:${mm}`;

  const simMatch = simulateTime && simulateTime.match(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/);
  const useSimulated = Boolean(simMatch);
  const matchTime = useSimulated ? `${simMatch![1].padStart(2, '0')}:${simMatch![2]}` : realTimeUtc;

  const { data: rows, error } = await admin
    .from('user_schedule')
    .select('user_id, launch_time, timezone');

  if (error) {
    console.error('[cron] getUsersWithScheduleMatchingNow error:', error.message);
    return { userIds: [], currentTimeUtc: matchTime };
  }

  const userIds: string[] = [];
  for (const row of rows || []) {
    const launchTime = row.launch_time;
    if (!launchTime) continue;
    const currentLocal = useSimulated
      ? matchTime
      : (() => {
          const tz = row.timezone && typeof row.timezone === 'string' ? row.timezone : 'UTC';
          try {
            return getCurrentTimeInTimezone(tz);
          } catch {
            return realTimeUtc;
          }
        })();
    const possibleLaunch = [launchTime];
    if (/^[0-9]:[0-5]\d$/.test(launchTime)) {
      possibleLaunch.push('0' + launchTime);
    }
    if (possibleLaunch.includes(currentLocal)) {
      userIds.push(row.user_id);
    }
  }

  return { userIds, currentTimeUtc: matchTime };
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

export interface ScheduledCampaignRun {
  userId: string;
  campaignId: string;
  slotIndex: number;
  deliveryMode: LaunchDeliveryMode;
}

/**
 * Returns which single campaign should run NOW for each user.
 * Campaigns are spread by hour: 1st at launch_time (e.g. 15:00), 2nd at 16:00, 3rd at 17:00, etc.
 * Optional simulateTime (HH:MM) for testing.
 */
export async function getScheduledCampaignRunsNow(
  simulateTime?: string | null
): Promise<{ runs: ScheduledCampaignRun[]; currentTimeUtc: string }> {
  const admin = createAdminClient();
  const now = new Date();
  const hh = String(now.getUTCHours()).padStart(2, '0');
  const mm = String(now.getUTCMinutes()).padStart(2, '0');
  const realTimeUtc = `${hh}:${mm}`;

  const simMatch = simulateTime && simulateTime.match(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/);
  const useSimulated = Boolean(simMatch);
  const matchTime = useSimulated ? `${simMatch![1].padStart(2, '0')}:${simMatch![2]}` : realTimeUtc;

  const { data: rows, error } = await admin
    .from('user_schedule')
    .select('user_id, launch_time, timezone, campaign_ids, launch_delivery_mode');

  if (error || !rows?.length) {
    return { runs: [], currentTimeUtc: matchTime };
  }

  const runs: ScheduledCampaignRun[] = [];
  for (const row of rows) {
    const launchTime = row.launch_time;
    const ids = row.campaign_ids;
    const campaignIds = Array.isArray(ids) ? ids.filter((id: unknown): id is string => typeof id === 'string') : [];
    if (!launchTime || campaignIds.length === 0) continue;

    const currentLocal = useSimulated
      ? matchTime
      : (() => {
          const tz = row.timezone && typeof row.timezone === 'string' ? row.timezone : 'UTC';
          try {
            return getCurrentTimeInTimezone(tz);
          } catch {
            return realTimeUtc;
          }
        })();

    const launchHour = parseInt(launchTime.slice(0, 2), 10) || 0;
    const currentHour = parseInt(currentLocal.slice(0, 2), 10) || 0;
    const slotIndex = (currentHour - launchHour + 24) % 24;

    if (slotIndex < campaignIds.length) {
      runs.push({
        userId: row.user_id,
        campaignId: campaignIds[slotIndex],
        slotIndex,
        deliveryMode: normalizeDeliveryMode(row.launch_delivery_mode),
      });
    }
  }

  return { runs, currentTimeUtc: matchTime };
}
