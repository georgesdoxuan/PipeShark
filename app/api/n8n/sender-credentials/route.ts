import { NextResponse } from 'next/server';
import { getSenderAccountByIdAdmin } from '@/lib/supabase-sender-accounts';

/**
 * GET /api/n8n/sender-credentials?sender_account_id=UUID&secret=...
 * Returns decrypted SMTP credentials for the given sender_account_id.
 * Protected by N8N_SECRET or CRON_SECRET (same as cron routes).
 * Used by n8n "Send from queue" workflow to send via nodemailer.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const senderAccountId = searchParams.get('sender_account_id');
  const secret = searchParams.get('secret') ?? request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  const expectedSecret = process.env.N8N_SECRET || process.env.CRON_SECRET;
  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!senderAccountId) {
    return NextResponse.json(
      { error: 'Missing sender_account_id' },
      { status: 400 }
    );
  }

  try {
    const creds = await getSenderAccountByIdAdmin(senderAccountId);
    if (!creds) {
      return NextResponse.json({ error: 'Sender account not found' }, { status: 404 });
    }
    return NextResponse.json({
      email: creds.email,
      smtp_host: creds.smtp_host,
      smtp_port: creds.smtp_port,
      smtp_user: creds.smtp_user,
      smtp_pass: creds.smtp_pass,
    });
  } catch (error: any) {
    console.error('n8n sender-credentials:', error);
    return NextResponse.json(
      { error: 'Failed to get credentials', details: error.message },
      { status: 500 }
    );
  }
}
