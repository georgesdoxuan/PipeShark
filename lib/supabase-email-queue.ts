import { DateTime } from 'luxon';
import { createServerSupabaseClient } from './supabase-server';
import { createAdminClient } from './supabase-server';
import { getTimezoneForLead } from './country-timezone';
import { getCampaignsByIdsAdmin } from './supabase-campaigns';
import { getSenderAccountIdByEmailAdmin } from './supabase-sender-accounts';
import { getLeadsWithDraftForEnqueueAdmin } from './supabase-leads';

export type EmailQueueStatus = 'pending' | 'sent' | 'failed' | 'cancelled';

export type DeliveryType = 'send' | 'draft';

export interface EmailQueueInsert {
  user_id: string;
  sender_account_id: string;
  lead_id?: string | null;
  recipient: string;
  subject: string;
  body: string;
  scheduled_at: string; // ISO
  delivery_type?: DeliveryType;
}

/** Bulk insert into email_queue. Caller must resolve sender_account_id. */
export async function insertEmailQueueRows(rows: EmailQueueInsert[]): Promise<number> {
  if (rows.length === 0) return 0;
  const supabase = await createServerSupabaseClient();
  const payload = rows.map((r) => ({
    user_id: r.user_id,
    sender_account_id: r.sender_account_id,
    lead_id: r.lead_id ?? null,
    recipient: r.recipient,
    subject: r.subject,
    body: r.body,
    scheduled_at: r.scheduled_at,
    status: 'pending',
    delivery_type: r.delivery_type ?? 'send',
    updated_at: new Date().toISOString(),
  }));
  const { data, error } = await supabase.from('email_queue').insert(payload).select('id');
  if (error) throw error;
  return (data || []).length;
}

/** Same as insertEmailQueueRows but using admin client (for cron). */
export async function insertEmailQueueRowsAdmin(rows: EmailQueueInsert[]): Promise<number> {
  if (rows.length === 0) return 0;
  const admin = createAdminClient();
  const payload = rows.map((r) => ({
    user_id: r.user_id,
    sender_account_id: r.sender_account_id,
    lead_id: r.lead_id ?? null,
    recipient: r.recipient,
    subject: r.subject,
    body: r.body,
    scheduled_at: r.scheduled_at,
    status: 'pending',
    delivery_type: r.delivery_type ?? 'send',
    updated_at: new Date().toISOString(),
  }));
  const { data, error } = await admin.from('email_queue').insert(payload).select('id');
  if (error) throw error;
  return (data || []).length;
}

/** Parse draft content: first line (or first block before \n\n) = subject, rest = body. */
export function parseDraftSubjectAndBody(content: string): { subject: string; body: string } {
  const trimmed = content.trim();
  const idx = trimmed.indexOf('\n\n');
  if (idx >= 0) {
    return { subject: trimmed.slice(0, idx).trim(), body: trimmed.slice(idx + 2).trim() };
  }
  const firstLineIdx = trimmed.indexOf('\n');
  if (firstLineIdx >= 0) {
    return {
      subject: trimmed.slice(0, firstLineIdx).trim(),
      body: trimmed.slice(firstLineIdx + 1).trim(),
    };
  }
  return { subject: trimmed, body: '' };
}

/** Random interval in ms between min and max (inclusive). */
function randomIntervalMs(minMinutes: number, maxMinutes: number): number {
  const min = minMinutes * 60 * 1000;
  const max = maxMinutes * 60 * 1000;
  return Math.floor(min + Math.random() * (max - min + 1));
}

const BUSINESS_HOUR_START = 9; // 9:00
const BUSINESS_HOUR_END = 18; // 18:00 (exclusive, so 9–17:59)

/**
 * Pick a random time in business hours (9–18) in the lead's timezone, on today or next business day.
 * Returns ISO string in UTC for scheduled_at.
 */
function toISOOrNow(dt: DateTime): string {
  const iso = dt.toUTC().toISO();
  return iso ?? new Date().toISOString();
}

function randomBusinessHourInTimezone(tz: string): string {
  const zone = tz || 'UTC';
  let nowInTz = DateTime.now().setZone(zone);
  if (!nowInTz.isValid) return new Date().toISOString();
  // If weekend, advance to next Monday 9:00
  if (nowInTz.weekday >= 6) {
    const daysToAdd = nowInTz.weekday === 6 ? 2 : 1;
    nowInTz = nowInTz.plus({ days: daysToAdd }).set({ hour: BUSINESS_HOUR_START, minute: 0, second: 0, millisecond: 0 });
    return toISOOrNow(nowInTz.plus({ minutes: Math.floor(Math.random() * (BUSINESS_HOUR_END - BUSINESS_HOUR_START) * 60) }));
  }
  const hour = nowInTz.hour;
  const startOfBusiness = nowInTz.set({ hour: BUSINESS_HOUR_START, minute: 0, second: 0, millisecond: 0 });
  // If before 9, use today 9–18 random
  if (hour < BUSINESS_HOUR_START) {
    const randomMinutes = Math.floor(Math.random() * (BUSINESS_HOUR_END - BUSINESS_HOUR_START) * 60);
    return toISOOrNow(startOfBusiness.plus({ minutes: randomMinutes }));
  }
  // If already in business hours, random from now to 17:59
  if (hour < BUSINESS_HOUR_END) {
    const nowMinutes = nowInTz.hour * 60 + nowInTz.minute;
    const endMinutes = (BUSINESS_HOUR_END - 1) * 60 + 59;
    const span = endMinutes - nowMinutes;
    const addMinutes = span <= 0 ? 0 : Math.floor(Math.random() * span);
    return toISOOrNow(nowInTz.plus({ minutes: addMinutes }));
  }
  // After 18:00, next weekday at random 9–18
  let next = nowInTz.plus({ days: 1 });
  if (next.weekday >= 6) next = next.plus({ days: next.weekday === 6 ? 2 : 1 });
  const slot = next.set({ hour: BUSINESS_HOUR_START, minute: 0, second: 0, millisecond: 0 })
    .plus({ minutes: Math.floor(Math.random() * (BUSINESS_HOUR_END - BUSINESS_HOUR_START) * 60) });
  return toISOOrNow(slot);
}

export interface LeadForScheduling {
  city?: string | null;
  country?: string | null;
}

/**
 * Build one scheduled_at per lead so emails are sent during business hours (9–18)
 * in the lead's country timezone, at random times throughout the day.
 */
export function buildScheduledAtForLeads(leads: LeadForScheduling[]): string[] {
  return leads.map((lead) => {
    const tz = getTimezoneForLead(lead.country, lead.city);
    return randomBusinessHourInTimezone(tz);
  });
}

/**
 * Build scheduled_at for each lead with 15–20 min random spacing to avoid spam filters.
 * Base time = now; each next item is base + cumulative random 15–20 min.
 * @deprecated Prefer buildScheduledAtForLeads for business-hours scheduling.
 */
export function buildScheduledTimes(count: number): string[] {
  const now = Date.now();
  const out: string[] = [];
  let acc = 0;
  for (let i = 0; i < count; i++) {
    acc += randomIntervalMs(15, 20);
    out.push(new Date(now + acc).toISOString());
  }
  return out;
}

/** Get lead IDs that already have a pending/sent queue row (to avoid duplicate enqueue). */
export async function getLeadIdsAlreadyInQueue(userId: string, leadIds: string[]): Promise<Set<string>> {
  if (leadIds.length === 0) return new Set();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('email_queue')
    .select('lead_id')
    .eq('user_id', userId)
    .in('lead_id', leadIds)
    .in('status', ['pending', 'sent']);
  if (error) return new Set();
  const set = new Set<string>();
  for (const row of data || []) {
    if (row.lead_id) set.add(row.lead_id);
  }
  return set;
}

/** Per-lead queue info (delivery_type, scheduled_at). Matches by lead_id first, then by recipient email when lead_id is null. */
export async function getQueueInfoForLeads(
  userId: string,
  leads: { id: string; email: string | null }[]
): Promise<Record<string, { delivery_type: DeliveryType; scheduled_at: string }>> {
  if (leads.length === 0) return {};
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('email_queue')
    .select('lead_id, recipient, delivery_type, scheduled_at, created_at')
    .eq('user_id', userId)
    .in('status', ['pending', 'sent'])
    .order('created_at', { ascending: false });

  if (error) return {};
  const leadIds = new Set(leads.map((l) => l.id));
  const emailToLeadId = new Map<string, string>();
  for (const l of leads) {
    if (l.email) emailToLeadId.set(l.email.trim().toLowerCase(), l.id);
  }
  const out: Record<string, { delivery_type: DeliveryType; scheduled_at: string }> = {};
  const assignedByEmail = new Set<string>();

  for (const row of data || []) {
    const info = {
      delivery_type: (row.delivery_type === 'draft' ? 'draft' : 'send') as DeliveryType,
      scheduled_at: String(row.scheduled_at ?? ''),
    };
    const lid = row.lead_id as string | null;
    if (lid && leadIds.has(lid) && out[lid] === undefined) {
      out[lid] = info;
      continue;
    }
    const recipient = (row.recipient as string || '').trim().toLowerCase();
    if (!recipient) continue;
    const matchedLeadId = emailToLeadId.get(recipient);
    if (matchedLeadId && out[matchedLeadId] === undefined && !assignedByEmail.has(recipient)) {
      out[matchedLeadId] = info;
      assignedByEmail.add(recipient);
    }
  }
  return out;
}

/** Update subject and body of pending queue row(s) for a lead so scheduled send uses the new draft. */
export async function updatePendingQueueDraftByLeadId(
  userId: string,
  leadId: string,
  subject: string,
  body: string
): Promise<number> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('email_queue')
    .update({
      subject: (subject || '(No subject)').trim(),
      body: (body || '').trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('lead_id', leadId)
    .eq('status', 'pending')
    .select('id');
  if (error) return 0;
  return (data || []).length;
}

/** For n8n: fetch pending queue items where scheduled_at <= now (service role). */
export interface PendingQueueItem {
  id: string;
  user_id: string;
  sender_account_id: string;
  lead_id: string | null;
  recipient: string;
  subject: string;
  body: string;
  scheduled_at: string;
  delivery_type: DeliveryType;
}

/** Load a single queue item by id (admin). Returns null if not found or not pending. */
export async function getQueueItemByIdAdmin(queueId: string): Promise<(PendingQueueItem) | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('email_queue')
    .select('id, user_id, sender_account_id, lead_id, recipient, subject, body, scheduled_at, delivery_type')
    .eq('id', queueId)
    .eq('status', 'pending')
    .single();
  if (error || !data) return null;
  const row = data as PendingQueueItem & { delivery_type?: string };
  return { ...row, delivery_type: (row.delivery_type === 'draft' ? 'draft' : 'send') as DeliveryType };
}

export async function getPendingQueueItemsAdmin(limit: number = 10): Promise<PendingQueueItem[]> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from('email_queue')
    .select('id, user_id, sender_account_id, lead_id, recipient, subject, body, scheduled_at, delivery_type')
    .eq('status', 'pending')
    .lte('scheduled_at', now)
    .order('scheduled_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  const rows = (data || []) as (PendingQueueItem & { delivery_type?: string })[];
  return rows.map((r) => ({ ...r, delivery_type: (r.delivery_type === 'draft' ? 'draft' : 'send') as DeliveryType }));
}

/** Mark queue item as sent (n8n or API). */
export async function markQueueItemSentAdmin(queueId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from('email_queue')
    .update({ status: 'sent', updated_at: new Date().toISOString(), error_log: null })
    .eq('id', queueId);
  if (error) throw error;
}

/** Mark queue item as failed (n8n or API). */
export async function markQueueItemFailedAdmin(queueId: string, errorLog: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from('email_queue')
    .update({ status: 'failed', error_log: errorLog, updated_at: new Date().toISOString() })
    .eq('id', queueId);
  if (error) throw error;
}

/** After sending: set lead.email_sent = true for the given lead_id. */
export async function markLeadEmailSentAdmin(leadId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from('leads').update({ email_sent: true }).eq('id', leadId);
  if (error) throw error;
}

/**
 * Enqueue campaign leads (with draft) into email_queue using admin client.
 * Used by cron after Daily Launch: deliveryType 'send' = SMTP at scheduled times, 'draft' = Gmail draft at scheduled times.
 * Returns number of rows enqueued; throws if campaign not found or no sender account.
 */
export async function enqueueCampaignLeadsForUser(
  userId: string,
  campaignId: string,
  options?: { deliveryType?: DeliveryType }
): Promise<number> {
  const deliveryType = options?.deliveryType === 'draft' ? 'draft' : 'send';
  const campaigns = await getCampaignsByIdsAdmin(userId, [campaignId]);
  const campaign = campaigns[0];
  if (!campaign) throw new Error('Campaign not found');
  const senderAccountId = await getSenderAccountIdByEmailAdmin(userId, campaign.gmailEmail ?? null);
  if (!senderAccountId) throw new Error('No SMTP sender account for this campaign');
  const leads = await getLeadsWithDraftForEnqueueAdmin(userId, campaignId);
  if (leads.length === 0) return 0;
  const leadIds = leads.map((l) => l.id);
  const alreadyInQueue = await getLeadIdsAlreadyInQueue(userId, leadIds);
  const toEnqueue = leads.filter((l) => !alreadyInQueue.has(l.id));
  if (toEnqueue.length === 0) return 0;
  const scheduledTimes = buildScheduledAtForLeads(toEnqueue);
  const rows: EmailQueueInsert[] = toEnqueue.map((lead, i) => {
    const { subject, body } = parseDraftSubjectAndBody(lead.draft);
    return {
      user_id: userId,
      sender_account_id: senderAccountId,
      lead_id: lead.id,
      recipient: lead.email,
      subject: subject || '(No subject)',
      body: body || '',
      scheduled_at: scheduledTimes[i],
      delivery_type: deliveryType,
    };
  });
  return insertEmailQueueRowsAdmin(rows);
}
