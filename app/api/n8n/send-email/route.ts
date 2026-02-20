import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getSenderAccountByIdAdmin } from '@/lib/supabase-sender-accounts';

/**
 * POST /api/n8n/send-email
 * Body: { sender_account_id, recipient, subject, body, queue_id?, lead_id? }
 * Sends one email via SMTP using the sender account. Protected by N8N_SECRET or CRON_SECRET.
 * Used by n8n when nodemailer is disallowed in Code node; n8n calls this instead.
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
    lead_id?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { sender_account_id, recipient, subject, body: textBody, queue_id, lead_id } = body;
  if (!sender_account_id || !recipient) {
    return NextResponse.json(
      { error: 'Missing sender_account_id or recipient' },
      { status: 400 }
    );
  }

  try {
    const creds = await getSenderAccountByIdAdmin(sender_account_id);
    if (!creds) {
      return NextResponse.json({ error: 'Sender account not found' }, { status: 404 });
    }

    const transporter = nodemailer.createTransport({
      host: creds.smtp_host,
      port: creds.smtp_port,
      secure: creds.smtp_port === 465,
      auth: {
        user: creds.smtp_user || creds.email,
        pass: creds.smtp_pass,
      },
    });

    await transporter.sendMail({
      from: creds.email,
      to: recipient,
      subject: subject ?? '(No subject)',
      text: textBody ?? '',
      html: (textBody ?? '').replace(/\n/g, '<br>'),
    });

    return NextResponse.json({
      ok: true,
      queueId: queue_id ?? null,
      leadId: lead_id ?? null,
    });
  } catch (error: any) {
    console.error('n8n send-email:', error);
    return NextResponse.json(
      { error: 'Send failed', details: error.message },
      { status: 500 }
    );
  }
}
