import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createAdminClient } from '@/lib/supabase-server';
import { getSenderAccountByIdAdmin } from '@/lib/supabase-sender-accounts';
import { getQueueItemByIdAdmin, markQueueItemSentAdmin, markQueueItemFailedAdmin } from '@/lib/supabase-email-queue';
import { getGmailTokensForEmail } from '@/lib/supabase-gmail-accounts';
import { getValidGmailAccessToken } from '@/lib/gmail';
import { sendGmailMessage } from '@/lib/gmail-api';

/**
 * POST /api/n8n/send-email
 * Body: { sender_account_id, recipient, subject, body, queue_id?, lead_id? }
 * Sends one email: SMTP (sender_account_id) or Gmail (when queue item has connection_type=gmail).
 * If queue_id is provided and item.connection_type is 'gmail', resolves Gmail and sends via Gmail API.
 * Protected by N8N_SECRET or CRON_SECRET.
 */
export async function POST(request: Request) {
  const secret =
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
    new URL(request.url).searchParams.get('secret');
  const expectedSecret = process.env.N8N_SECRET || process.env.CRON_SECRET;
  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    sender_account_id?: string;
    recipient?: string;
    subject?: string;
    body?: string;
    queue_id?: string;
    id?: string;
    lead_id?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const queue_id = body.queue_id ?? body.id ?? undefined;
  const { sender_account_id, recipient, subject, body: textBody, lead_id } = body;

  // If queue_id provided, load item and try Gmail path when connection_type is gmail
  let item: Awaited<ReturnType<typeof getQueueItemByIdAdmin>> = null;
  if (queue_id) {
    item = await getQueueItemByIdAdmin(queue_id);
    if (item && item.connection_type === 'gmail') {
      try {
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
          await markQueueItemFailedAdmin(queue_id, 'Gmail not connected for this user');
          return NextResponse.json({ error: 'Gmail not connected for this user' }, { status: 400 });
        }
        const accessToken = await getValidGmailAccessToken(
          userProfile.gmail_access_token,
          userProfile.gmail_refresh_token,
          userProfile.gmail_token_expiry,
          item.user_id,
          userProfile.gmail_email
        );
        const sent = await sendGmailMessage(
          accessToken,
          item.recipient,
          item.subject,
          item.body
        );
        if (!sent) {
          await markQueueItemFailedAdmin(queue_id, 'Gmail send failed');
          return NextResponse.json({ error: 'Gmail send failed' }, { status: 500 });
        }
        await markQueueItemSentAdmin(queue_id);
        return NextResponse.json({
          ok: true,
          queueId: queue_id,
          leadId: item.lead_id ?? lead_id ?? null,
        });
      } catch (error: any) {
        console.error('n8n send-email (Gmail):', error);
        await markQueueItemFailedAdmin(queue_id, error.message ?? 'Send failed');
        return NextResponse.json(
          { error: 'Send failed', details: error.message },
          { status: 500 }
        );
      }
    }
    // Fall through to SMTP with body fields (item may be null or connection_type smtp)
  }

  // SMTP path: require sender_account_id and recipient (from body or from loaded item)
  const smtpSenderId = sender_account_id ?? item?.sender_account_id;
  const smtpRecipient = recipient ?? item?.recipient;
  const smtpSubject = subject ?? item?.subject ?? '(No subject)';
  const smtpBody = textBody ?? item?.body ?? '';
  if (!smtpSenderId || !smtpRecipient) {
    return NextResponse.json(
      { error: 'Missing sender_account_id or recipient' },
      { status: 400 }
    );
  }

  try {
    const creds = await getSenderAccountByIdAdmin(smtpSenderId);
    if (!creds) {
      return NextResponse.json({ error: 'Sender account not found' }, { status: 404 });
    }

    const smtpPass = (creds.smtp_pass || '').replace(/\s/g, '').trim();
    const smtpUser = (creds.smtp_user || creds.email || '').trim();

    const transporter = nodemailer.createTransport({
      host: (creds.smtp_host || '').trim(),
      port: creds.smtp_port,
      secure: creds.smtp_port === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.sendMail({
      from: creds.email,
      to: smtpRecipient,
      subject: smtpSubject,
      text: smtpBody,
      html: smtpBody.replace(/\n/g, '<br>'),
    });

    return NextResponse.json({
      ok: true,
      queueId: queue_id ?? null,
      leadId: lead_id ?? null,
    });
  } catch (error: any) {
    console.error('n8n send-email:', error);
    if (queue_id) {
      await markQueueItemFailedAdmin(queue_id, error.message ?? 'Send failed');
    }
    return NextResponse.json(
      { error: 'Send failed', details: error.message },
      { status: 500 }
    );
  }
}
