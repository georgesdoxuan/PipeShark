import { createServerSupabaseClient, createAdminClient } from './supabase-server';

export interface Lead {
  id: string;
  user_id: string;
  business_type: string | null;
  city: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  url: string | null;
  draft: string | null;
  date: string | null;
  created_at: string | null;
  replied: boolean;
  replied_at: string | null;
  gmail_thread_id: string | null;
}

function mapLeadRecord(record: any) {
  return {
    id: record.id,
    campaignId: record.campaign_id ?? null,
    businessType: record.business_type,
    city: record.city,
    country: record.country ?? null,
    email: record.email,
    phone: record.phone,
    linkedin: record.linkedin,
    url: record.url,
    draft: record.draft ?? null,
    emailDraftCreated: !!record.draft,
    draftCreatedDate: record.draft ? record.date : null,
    date: record.date || record.created_at,
    replied: !!record.replied,
    repliedAt: record.replied_at ?? null,
    gmailThreadId: record.gmail_thread_id ?? null,
    emailSent: !!record.email_sent,
  };
}

export async function getLeadsForUser(userId: string, campaignId?: string) {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from('leads')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (campaignId) {
    query = query.eq('campaign_id', campaignId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data || []).map(mapLeadRecord);
}

/** Get the most recent lead date per campaign (for dashboard cards). Returns campaign_id -> ISO date string. */
export async function getLastLeadAtByCampaign(
  userId: string
): Promise<Record<string, string>> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('leads')
    .select('campaign_id, created_at')
    .eq('user_id', userId)
    .not('campaign_id', 'is', null)
    .order('created_at', { ascending: false });

  if (error) return {};
  const out: Record<string, string> = {};
  for (const row of data || []) {
    const cid = row.campaign_id;
    if (cid && out[cid] === undefined && row.created_at) {
      out[cid] = row.created_at;
    }
  }
  return out;
}

/** Campaign info needed for fallback when leads don't have campaign_id (n8n not updated yet) */
export interface CampaignMatchInfo {
  id: string;
  businessType: string;
  cities?: string[];
  createdAt: string;
}

/**
 * Get leads for a campaign. Uses campaign_id when set.
 * Fallback: if leads have campaign_id = NULL (n8n not updated), match by businessType + cities + createdAfter.
 */
export async function getLeadsForCampaign(
  userId: string,
  campaign: CampaignMatchInfo
): Promise<ReturnType<typeof mapLeadRecord>[]> {
  const supabase = await createServerSupabaseClient();

  // Fetch all user leads (we need both campaign_id = X and campaign_id IS NULL for fallback)
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) {
    throw error;
  }

  const campaignCreatedAt = new Date(campaign.createdAt).getTime();
  const records = data || [];

  const matched = records.filter((record: any) => {
    // Direct match: lead has this campaign_id
    if (record.campaign_id === campaign.id) {
      return true;
    }
    // Fallback: lead has no campaign_id (n8n not updated) - match by criteria
    if (record.campaign_id == null) {
      const matchesBusinessType =
        record.business_type?.toLowerCase() === campaign.businessType.toLowerCase();
      const matchesCity =
        !campaign.cities ||
        campaign.cities.length === 0 ||
        (record.city &&
          campaign.cities.some(
            (c: string) => record.city?.toLowerCase() === c.toLowerCase()
          ));
      const leadCreatedAt = record.date ? new Date(record.date).getTime() : record.created_at ? new Date(record.created_at).getTime() : 0;
      const createdAfterCampaign = leadCreatedAt >= campaignCreatedAt;
      return matchesBusinessType && matchesCity && createdAfterCampaign;
    }
    return false;
  });

  // When campaign has specific cities (e.g. Toronto only), show only leads from those cities.
  // n8n sometimes returns leads from other cities; filtering here ensures the campaign shows only the requested city.
  let toReturn = matched;
  if (campaign.cities && campaign.cities.length > 0) {
    const citySet = new Set(campaign.cities.map((c: string) => c.trim().toLowerCase()));
    toReturn = matched.filter((record: any) => {
      const leadCity = record.city?.trim().toLowerCase();
      return leadCity && citySet.has(leadCity);
    });
  }

  return toReturn.map(mapLeadRecord);
}

export async function countTodayLeadsForUser(userId: string): Promise<number> {
  const supabase = await createServerSupabaseClient();

  const today = new Date().toISOString().split('T')[0];
  const startOfDay = `${today}T00:00:00.000Z`;
  const endOfDay = `${today}T23:59:59.999Z`;

  const { data, error } = await supabase
    .from('leads')
    .select('id, email')
    .eq('user_id', userId)
    .gte('created_at', startOfDay)
    .lte('created_at', endOfDay);

  if (error) {
    throw error;
  }

  // Filter leads with valid email (not null, not empty, not "No email found")
  const withEmail = (data || []).filter(
    (lead) =>
      lead.email &&
      lead.email.trim() !== '' &&
      lead.email.toLowerCase() !== 'no email found'
  );

  return withEmail.length;
}

const SELECT_LEADS_WITH_REPLIES = 'email, draft, replied, replied_at, date, created_at, email_sent';
const SELECT_LEADS_BASIC = 'email, draft, date, created_at';

export async function getCampaignStatsForUser(userId: string) {
  const supabase = await createServerSupabaseClient();

  let selectColumns = SELECT_LEADS_WITH_REPLIES;
  let { data, error } = await supabase
    .from('leads')
    .select(selectColumns)
    .eq('user_id', userId);

  // If replied/replied_at columns don't exist (migration 016 not applied), retry without them
  if (error && /replied|does not exist/i.test(error.message)) {
    selectColumns = SELECT_LEADS_BASIC;
    const fallback = await supabase
      .from('leads')
      .select(selectColumns)
      .eq('user_id', userId);
    data = fallback.data;
    error = fallback.error;
  }
  // If email_sent column doesn't exist (migration 019 not applied), retry without it
  if (error && /email_sent|does not exist/i.test(error.message)) {
    selectColumns = 'email, draft, replied, replied_at, date, created_at';
    const fallback = await supabase
      .from('leads')
      .select(selectColumns)
      .eq('user_id', userId);
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    throw error;
  }

  const leads = (data || []) as Array<{
    email?: string | null;
    draft?: string | null;
    replied?: boolean;
    replied_at?: string | null;
    date?: string | null;
    created_at?: string;
    email_sent?: boolean;
  }>;
  const total = leads.length;
  const withEmail = leads.filter(
    (l) =>
      l.email &&
      l.email.trim() !== '' &&
      l.email.toLowerCase() !== 'no email found'
  ).length;
  const draftsSent = leads.filter((l) => l.draft && l.draft.trim() !== '').length;
  const hasRepliedColumn = selectColumns.includes('replied');
  const hasEmailSentColumn = selectColumns.includes('email_sent');
  const emailsSentCount = hasEmailSentColumn ? leads.filter((l) => !!l.email_sent).length : draftsSent;
  const repliedCount = hasRepliedColumn ? leads.filter((l) => !!l.replied).length : 0;
  const repliedLeadsWithDates = hasRepliedColumn
    ? leads.filter(
        (l) => !!l.replied && l.replied_at && (l.date || l.created_at)
      )
    : [];
  const avgTimeToReplyMs =
    repliedLeadsWithDates.length > 0
      ? repliedLeadsWithDates.reduce((acc, l) => {
          const sentAt = l.date
            ? new Date(l.date).getTime()
            : l.created_at
              ? new Date(l.created_at).getTime()
              : 0;
          const repliedAt = l.replied_at ? new Date(l.replied_at).getTime() : 0;
          return acc + (repliedAt - sentAt);
        }, 0) / repliedLeadsWithDates.length
      : null;
  const replyRate =
    draftsSent > 0 ? ((repliedCount / draftsSent) * 100).toFixed(1) : '0';

  return {
    totalLeads: total,
    leadsWithEmail: withEmail,
    emailsSent: emailsSentCount,
    conversionRate: total > 0 ? ((withEmail / total) * 100).toFixed(1) : '0',
    repliesCount: repliedCount,
    replyRate,
    avgTimeToReplyHours: avgTimeToReplyMs != null ? (avgTimeToReplyMs / (1000 * 60 * 60)).toFixed(1) : null,
  };
}

/** Leads that have a draft and not yet sent, for enqueue (SMTP queue). Excludes invalid emails. */
export async function getLeadsWithDraftForEnqueue(
  userId: string,
  campaignId: string
): Promise<{ id: string; email: string; draft: string }[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('leads')
    .select('id, email, draft')
    .eq('user_id', userId)
    .eq('campaign_id', campaignId)
    .eq('email_sent', false)
    .not('draft', 'is', null);
  if (error) throw error;
  const rows = (data || []).filter(
    (r: any) =>
      r.email &&
      String(r.email).trim() &&
      String(r.email).toLowerCase() !== 'no email found' &&
      r.draft &&
      String(r.draft).trim()
  );
  return rows.map((r: any) => ({ id: r.id, email: r.email.trim(), draft: String(r.draft).trim() }));
}

/** Count leads for a campaign (admin, for cron). */
export async function countLeadsForCampaignAdmin(
  userId: string,
  campaignId: string
): Promise<number> {
  const supabase = await createAdminClient();
  const { count, error } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('campaign_id', campaignId);
  if (error) return 0;
  return count ?? 0;
}

/** Mark a lead as replied (used by check-replies API). */
export async function markLeadReplied(
  leadId: string,
  userId: string
): Promise<boolean> {
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from('leads')
    .update({
      replied: true,
      replied_at: new Date().toISOString(),
    })
    .eq('id', leadId)
    .eq('user_id', userId);
  return !error;
}

/** Mark a lead as email sent (user sent the email from their mailbox). */
export async function markLeadEmailSent(
  leadId: string,
  userId: string
): Promise<boolean> {
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from('leads')
    .update({ email_sent: true })
    .eq('id', leadId)
    .eq('user_id', userId);
  return !error;
}

/** Set email_sent to a given value (e.g. false when thread has no SENT message from user). */
export async function setLeadEmailSent(
  leadId: string,
  userId: string,
  value: boolean
): Promise<boolean> {
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from('leads')
    .update({ email_sent: value })
    .eq('id', leadId)
    .eq('user_id', userId);
  return !error;
}

export interface NotificationReply {
  id: string;
  email: string | null;
  replied_at: string;
  campaign_id: string | null;
}

export interface TodayLeadNotification {
  id: string;
  created_at: string;
  campaign_id: string | null;
  business_type: string | null;
}

export interface NotificationsForUser {
  todayLeadsCount: number;
  todayLeads: TodayLeadNotification[];
  recentReplies: NotificationReply[];
}

/** For header notifications: today's leads (with time), and recent replies. */
export async function getNotificationsForUser(userId: string): Promise<NotificationsForUser> {
  const supabase = await createServerSupabaseClient();

  const today = new Date().toISOString().split('T')[0];
  const startOfDay = `${today}T00:00:00.000Z`;
  const endOfDay = `${today}T23:59:59.999Z`;

  const { data: todayLeadsData, error: todayError } = await supabase
    .from('leads')
    .select('id, created_at, email, campaign_id, business_type')
    .eq('user_id', userId)
    .gte('created_at', startOfDay)
    .lte('created_at', endOfDay)
    .order('created_at', { ascending: false });

  const todayLeads: TodayLeadNotification[] = [];
  if (!todayError && todayLeadsData) {
    for (const row of todayLeadsData) {
      if (!row.created_at) continue;
      const email = row.email && String(row.email).trim() !== '' && String(row.email).toLowerCase() !== 'no email found';
      if (email) {
        todayLeads.push({
          id: row.id,
          created_at: row.created_at,
          campaign_id: row.campaign_id ?? null,
          business_type: row.business_type ?? null,
        });
      }
    }
  }

  const todayCount = todayLeads.length;

  let recentReplies: NotificationReply[] = [];
  const { data: repliesData, error: repliesError } = await supabase
    .from('leads')
    .select('id, email, replied_at, campaign_id')
    .eq('user_id', userId)
    .eq('replied', true)
    .not('replied_at', 'is', null)
    .order('replied_at', { ascending: false })
    .limit(15);

  if (!repliesError && repliesData) {
    recentReplies = repliesData.map((r: any) => ({
      id: r.id,
      email: r.email ?? null,
      replied_at: r.replied_at,
      campaign_id: r.campaign_id ?? null,
    }));
  }

  return {
    todayLeadsCount: todayCount,
    todayLeads,
    recentReplies,
  };
}
