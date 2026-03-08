import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server';
import {
  buildScheduledAtForLeads,
  getLeadIdsAlreadyInQueue,
  insertEmailQueueRowsAdmin,
  parseDraftSubjectAndBody,
  type DeliveryType,
  type EmailQueueInsert,
} from '@/lib/supabase-email-queue';
import { getSenderAccountIdByEmailAdmin } from '@/lib/supabase-sender-accounts';
import { getMailConnectionTypeForUser } from '@/lib/supabase-preferences';

/**
 * POST /api/leads/enqueue
 * Add specific leads to the send queue.
 * Body: { leadIds: string[], deliveryType: 'send' | 'draft' }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const leadIds: string[] = Array.isArray(body.leadIds) ? body.leadIds : [];
    const deliveryType: DeliveryType = body.deliveryType === 'draft' ? 'draft' : 'send';

    if (leadIds.length === 0) {
      return NextResponse.json({ error: 'No leads selected', enqueued: 0 }, { status: 400 });
    }

    const admin = createAdminClient();

    // Fetch leads belonging to this user, with draft + email
    const { data: leads, error: leadsError } = await admin
      .from('leads')
      .select('id, email, draft, city, country, campaign_id')
      .eq('user_id', user.id)
      .in('id', leadIds)
      .not('draft', 'is', null)
      .not('email', 'is', null);

    if (leadsError) throw leadsError;
    if (!leads || leads.length === 0) {
      return NextResponse.json({ enqueued: 0, message: 'No leads with email and draft found.' });
    }

    // Skip leads already pending/sent in queue
    const alreadyInQueue = await getLeadIdsAlreadyInQueue(user.id, leads.map((l) => l.id));
    const toEnqueue = leads.filter((l) => !alreadyInQueue.has(l.id) && l.email && l.draft);
    if (toEnqueue.length === 0) {
      return NextResponse.json({ enqueued: 0, message: 'All selected leads are already in queue.' });
    }

    // Find sender account: try campaign's gmail_email, then primary, then any
    const uniqueCampaignIds = [...new Set(toEnqueue.map((l) => l.campaign_id).filter(Boolean))];
    let senderAccountId: string | null = null;

    if (uniqueCampaignIds.length > 0) {
      const { data: campaign } = await admin
        .from('campaigns')
        .select('gmail_email')
        .eq('id', uniqueCampaignIds[0])
        .single();
      if (campaign?.gmail_email) {
        senderAccountId = await getSenderAccountIdByEmailAdmin(user.id, campaign.gmail_email);
      }
    }

    if (!senderAccountId) {
      const { data: primary } = await admin
        .from('sender_accounts')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .limit(1)
        .single();
      senderAccountId = primary?.id ?? null;
    }

    if (!senderAccountId) {
      const { data: any } = await admin
        .from('sender_accounts')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)
        .single();
      senderAccountId = any?.id ?? null;
    }

    if (!senderAccountId) {
      return NextResponse.json(
        { error: 'No sender account configured. Please add a sender account in Preferences.' },
        { status: 400 }
      );
    }

    const connectionType = await getMailConnectionTypeForUser(user.id);
    const scheduledTimes = buildScheduledAtForLeads(toEnqueue);

    const rows: EmailQueueInsert[] = toEnqueue.map((lead, i) => {
      const { subject, body: emailBody } = parseDraftSubjectAndBody(lead.draft as string);
      return {
        user_id: user.id,
        sender_account_id: senderAccountId!,
        lead_id: lead.id,
        recipient: lead.email as string,
        subject: subject || '(No subject)',
        body: emailBody || '',
        scheduled_at: scheduledTimes[i],
        delivery_type: deliveryType,
        connection_type: connectionType,
      };
    });

    const enqueued = await insertEmailQueueRowsAdmin(rows);
    return NextResponse.json({ success: true, enqueued });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to enqueue';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
