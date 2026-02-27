import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-server';
import { getGmailTokensForEmail } from '@/lib/supabase-gmail-accounts';
import { getValidGmailAccessToken } from '@/lib/gmail';
import { getGmailThreadWithBodies } from '@/lib/gmail-api';

/**
 * GET /api/messages/thread?leadId=xxx
 * Returns the Gmail thread messages for a lead (sent by user + replies from prospect).
 */
export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get('leadId');
  if (!leadId) {
    return NextResponse.json({ error: 'Missing leadId' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: lead, error: leadError } = await admin
    .from('leads')
    .select('id, email, campaign_id, user_id, gmail_thread_id')
    .eq('id', leadId)
    .eq('user_id', user.id)
    .single();

  if (leadError || !lead?.gmail_thread_id) {
    return NextResponse.json(
      { error: 'Lead not found or has no Gmail thread' },
      { status: 404 }
    );
  }

  let gmailEmail: string | null = null;
  if (lead.campaign_id) {
    const { data: campaign } = await admin
      .from('campaigns')
      .select('gmail_email')
      .eq('id', lead.campaign_id)
      .eq('user_id', user.id)
      .single();
    if (campaign?.gmail_email) gmailEmail = campaign.gmail_email;
  }

  const profile = await getGmailTokensForEmail(user.id, gmailEmail);
  if (!profile?.gmail_access_token || !profile.gmail_refresh_token) {
    return NextResponse.json(
      { error: 'Gmail not connected. Connect Gmail in Preferences.' },
      { status: 400 }
    );
  }

  let accessToken: string;
  try {
    accessToken = await getValidGmailAccessToken(
      profile.gmail_access_token,
      profile.gmail_refresh_token,
      profile.gmail_token_expiry,
      user.id,
      profile.gmail_email
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Gmail token expired. Reconnect Gmail in Preferences.' },
      { status: 400 }
    );
  }

  const userEmail = (profile.gmail_email || '').trim().toLowerCase();
  if (!userEmail) {
    return NextResponse.json(
      { error: 'Gmail email not found' },
      { status: 400 }
    );
  }

  const messages = await getGmailThreadWithBodies(
    accessToken,
    lead.gmail_thread_id,
    userEmail
  );

  // Envois programmés (pending) pour ce lead — éditables avant l'envoi
  // On récupère les lignes avec lead_id = leadId OU (lead_id null et recipient = email du lead)
  let pendingQueueItems: { id: string; subject: string; body: string; scheduled_at: string }[] = [];
  const { data: byLeadId } = await supabase
    .from('email_queue')
    .select('id, subject, body, scheduled_at')
    .eq('user_id', user.id)
    .eq('lead_id', leadId)
    .eq('status', 'pending')
    .order('scheduled_at', { ascending: true });
  const leadEmail = (lead.email || '').trim().toLowerCase();
  let byRecipient: any[] = [];
  if (leadEmail) {
    const { data: rec } = await supabase
      .from('email_queue')
      .select('id, subject, body, scheduled_at')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .is('lead_id', null)
      .ilike('recipient', leadEmail)
      .order('scheduled_at', { ascending: true });
    byRecipient = rec ?? [];
  }
  const seen = new Set<string>();
  const rows = [...(byLeadId ?? []), ...byRecipient].filter((r: any) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
  if (rows.length) {
    pendingQueueItems = rows.map((r: any) => {
      const raw = r.scheduled_at;
      const scheduled_at =
        typeof raw === 'string'
          ? raw
          : raw instanceof Date
            ? raw.toISOString()
            : raw != null
              ? String(raw)
              : '';
      return {
        id: r.id,
        subject: r.subject ?? '',
        body: r.body ?? '',
        scheduled_at,
      };
    });
  }

  return NextResponse.json({
    leadId: lead.id,
    email: lead.email,
    threadId: lead.gmail_thread_id,
    messages,
    pendingQueueItems,
  });
}
