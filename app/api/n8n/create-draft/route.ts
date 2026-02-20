import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { getQueueItemByIdAdmin, markQueueItemSentAdmin } from '@/lib/supabase-email-queue';
import { getGmailTokensForEmail } from '@/lib/supabase-gmail-accounts';
import { getValidGmailAccessToken } from '@/lib/gmail';
import { createGmailDraft } from '@/lib/gmail-api';

/**
 * POST /api/n8n/create-draft
 * Body: { queue_id } (or queueId)
 * Loads the queue item, resolves Gmail account from lead → campaign, creates a Gmail draft, marks queue item as sent.
 * Protected by N8N_SECRET or CRON_SECRET. Used by n8n Schedule workflow for delivery_type = 'draft'.
 */
export async function POST(request: Request) {
  const secret =
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
    new URL(request.url).searchParams.get('secret');
  const expectedSecret = process.env.N8N_SECRET || process.env.CRON_SECRET;
  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { queue_id?: string; queueId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const queueId = body.queue_id ?? body.queueId;
  if (!queueId || typeof queueId !== 'string') {
    return NextResponse.json({ error: 'Missing queue_id or queueId' }, { status: 400 });
  }

  const item = await getQueueItemByIdAdmin(queueId);
  if (!item) {
    return NextResponse.json({ error: 'Queue item not found or not pending' }, { status: 404 });
  }

  if (item.delivery_type !== 'draft') {
    return NextResponse.json({ error: 'Queue item is not a draft' }, { status: 400 });
  }

  let gmailEmail: string | null = null;
  if (item.lead_id) {
    const admin = createAdminClient();
    const { data: lead } = await admin
      .from('leads')
      .select('campaign_id')
      .eq('id', item.lead_id)
      .single();
    if (lead?.campaign_id) {
      const { data: campaign } = await admin
        .from('campaigns')
        .select('gmail_email')
        .eq('id', lead.campaign_id)
        .eq('user_id', item.user_id)
        .single();
      if (campaign?.gmail_email) gmailEmail = campaign.gmail_email;
    }
  }

  const userProfile = await getGmailTokensForEmail(item.user_id, gmailEmail);
  if (!userProfile?.gmail_access_token || !userProfile.gmail_refresh_token) {
    return NextResponse.json({ error: 'Gmail not connected for this user' }, { status: 400 });
  }

  let accessToken: string;
  try {
    accessToken = await getValidGmailAccessToken(
      userProfile.gmail_access_token,
      userProfile.gmail_refresh_token,
      userProfile.gmail_token_expiry,
      item.user_id,
      userProfile.gmail_email
    );
  } catch (tokenErr: any) {
    return NextResponse.json({ error: `Gmail token: ${tokenErr.message}` }, { status: 400 });
  }

  const draft = await createGmailDraft(
    accessToken,
    item.recipient,
    item.subject,
    item.body
  );
  if (!draft) {
    return NextResponse.json({ error: 'Failed to create Gmail draft' }, { status: 500 });
  }

  await markQueueItemSentAdmin(queueId);

  return NextResponse.json({
    ok: true,
    queueId,
    draftId: draft.id,
    messageId: draft.messageId,
  });
}
