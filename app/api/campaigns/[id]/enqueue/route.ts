import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getCampaignById } from '@/lib/supabase-campaigns';
import { getLeadsWithDraftForEnqueue } from '@/lib/supabase-leads';
import { getSenderAccountIdByEmail } from '@/lib/supabase-sender-accounts';
import {
  insertEmailQueueRows,
  parseDraftSubjectAndBody,
  buildScheduledAtForLeads,
  getLeadIdsAlreadyInQueue,
} from '@/lib/supabase-email-queue';

/**
 * POST /api/campaigns/[id]/enqueue
 * Enqueue campaign leads (with draft, not yet sent) into email_queue with scheduled_at
 * during business hours (9–18) in each lead's country timezone, at random times.
 * Requires sender account (SMTP) for campaign's gmail_email.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: campaignId } = await context.params;
    const campaign = await getCampaignById(user.id, campaignId);
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const senderAccountId = await getSenderAccountIdByEmail(
      user.id,
      campaign.gmailEmail ?? null
    );
    if (!senderAccountId) {
      return NextResponse.json(
        {
          error: 'No SMTP sender account',
          hint:
            'Add an email (SMTP) account in Preferences for this campaign’s sending address, then try again.',
        },
        { status: 400 }
      );
    }

    const leads = await getLeadsWithDraftForEnqueue(user.id, campaignId);
    if (leads.length === 0) {
      return NextResponse.json({
        success: true,
        enqueued: 0,
        message: 'No leads with draft to enqueue.',
      });
    }

    const leadIds = leads.map((l) => l.id);
    const alreadyInQueue = await getLeadIdsAlreadyInQueue(user.id, leadIds);
    const toEnqueue = leads.filter((l) => !alreadyInQueue.has(l.id));
    if (toEnqueue.length === 0) {
      return NextResponse.json({
        success: true,
        enqueued: 0,
        message: 'All these leads are already in the queue.',
      });
    }

    const scheduledTimes = buildScheduledAtForLeads(toEnqueue);
    const rows = toEnqueue.map((lead, i) => {
      const { subject, body } = parseDraftSubjectAndBody(lead.draft);
      return {
        user_id: user.id,
        sender_account_id: senderAccountId,
        lead_id: lead.id,
        recipient: lead.email,
        subject: subject || '(No subject)',
        body: body || '',
        scheduled_at: scheduledTimes[i],
      };
    });

    const enqueued = await insertEmailQueueRows(rows);

    return NextResponse.json({
      success: true,
      enqueued,
      message: `${enqueued} email(s) added to the send queue.`,
    });
  } catch (error: any) {
    console.error('Enqueue error:', error);
    const details = error?.message ?? (typeof error === 'string' ? error : String(error));
    return NextResponse.json(
      { error: 'Failed to enqueue', details },
      { status: 500 }
    );
  }
}
