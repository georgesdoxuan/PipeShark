import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server';
import { getSenderAccountIdByEmailAdmin } from '@/lib/supabase-sender-accounts';
import { getMailConnectionTypeForUser } from '@/lib/supabase-preferences';
import { buildScheduledAtForLeads, insertEmailQueueRowsAdmin } from '@/lib/supabase-email-queue';

/**
 * POST /api/messages/add-to-queue
 * Body: { leadId: string; subject: string; body: string }
 * Adds a manually-written follow-up email to the send queue at a random business-hours time.
 */
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { leadId, subject, body: emailBody } = body as { leadId?: string; subject?: string; body?: string };

  if (!leadId || !subject?.trim() || !emailBody?.trim()) {
    return NextResponse.json({ error: 'Missing leadId, subject or body' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: lead, error } = await admin
    .from('leads')
    .select('id, email, campaign_id, city, country')
    .eq('id', leadId)
    .eq('user_id', user.id)
    .single();

  if (error || !lead?.email) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  }

  let gmailEmail: string | null = null;
  if (lead.campaign_id) {
    const { data: campaign } = await admin
      .from('campaigns')
      .select('gmail_email')
      .eq('id', lead.campaign_id)
      .eq('user_id', user.id)
      .single();
    gmailEmail = campaign?.gmail_email ?? null;
  }

  const connectionType = await getMailConnectionTypeForUser(user.id);
  const senderAccountId = await getSenderAccountIdByEmailAdmin(user.id, gmailEmail);

  if (!senderAccountId && connectionType !== 'gmail') {
    return NextResponse.json({ error: 'No sender account configured. Add one in Preferences.' }, { status: 400 });
  }

  const [scheduledAt] = buildScheduledAtForLeads([{ city: lead.city as string | null, country: lead.country as string | null }]);

  await insertEmailQueueRowsAdmin([{
    user_id: user.id,
    sender_account_id: senderAccountId,
    lead_id: leadId,
    recipient: lead.email as string,
    subject: subject.trim(),
    body: emailBody.trim(),
    scheduled_at: scheduledAt,
    delivery_type: 'send',
    connection_type: connectionType,
  }]);

  return NextResponse.json({ success: true, scheduledAt });
}
