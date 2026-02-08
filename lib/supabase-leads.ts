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

  return matched.map(mapLeadRecord);
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

export async function getCampaignStatsForUser(userId: string) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('leads')
    .select('email, draft, replied, replied_at, date, created_at')
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  const leads = data || [];
  const total = leads.length;
  const withEmail = leads.filter(
    (l) =>
      l.email &&
      l.email.trim() !== '' &&
      l.email.toLowerCase() !== 'no email found'
  ).length;
  const draftsSent = leads.filter((l) => l.draft && l.draft.trim() !== '').length;
  const repliedCount = leads.filter((l) => !!l.replied).length;
  const repliedLeadsWithDates = leads.filter(
    (l) => !!l.replied && l.replied_at && (l.date || (l as any).created_at)
  );
  const avgTimeToReplyMs =
    repliedLeadsWithDates.length > 0
      ? repliedLeadsWithDates.reduce((acc, l) => {
          const sentAt = l.date
            ? new Date(l.date).getTime()
            : (l as any).created_at
              ? new Date((l as any).created_at).getTime()
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
    emailsSent: draftsSent,
    conversionRate: total > 0 ? ((withEmail / total) * 100).toFixed(1) : '0',
    repliesCount: repliedCount,
    replyRate,
    avgTimeToReplyHours: avgTimeToReplyMs != null ? (avgTimeToReplyMs / (1000 * 60 * 60)).toFixed(1) : null,
  };
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
