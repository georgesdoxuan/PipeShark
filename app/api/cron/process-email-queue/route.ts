/**
 * GET /api/cron/process-email-queue
 * Processes pending email_queue rows (scheduled_at <= now): sends or creates draft via existing APIs.
 * Replaces the n8n "Schedule Pipeshark" workflow (Get many rows → Loop → send-email / create-draft).
 * Protected by CRON_SECRET.
 */
import { NextResponse } from 'next/server';
import { getPendingQueueItemsAdmin } from '@/lib/supabase-email-queue';

const PROCESS_LIMIT = 50;
const BASE_URL = process.env.URL || process.env.VERCEL_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

function getOrigin(request: Request): string {
  try {
    const url = new URL(request.url);
    return url.origin;
  } catch {
    return BASE_URL;
  }
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    const querySecret = new URL(request.url).searchParams.get('secret');
    const isValid =
      authHeader === `Bearer ${cronSecret}` || querySecret === cronSecret;
    if (!isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const items = await getPendingQueueItemsAdmin(PROCESS_LIMIT);
    const origin = getOrigin(request);
    const secret = process.env.CRON_SECRET || process.env.N8N_SECRET || '';
    const authHeader = secret ? { Authorization: `Bearer ${secret}` } : {};
    let processed = 0;
    const errors: string[] = [];

    for (const item of items) {
      try {
        if (item.delivery_type === 'send') {
          const res = await fetch(`${origin}/api/n8n/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader },
            body: JSON.stringify({
              sender_account_id: item.sender_account_id,
              recipient: item.recipient,
              subject: item.subject,
              body: item.body,
              queue_id: item.id,
              lead_id: item.lead_id ?? undefined,
            }),
          });
          if (res.ok) processed++;
          else errors.push(`send ${item.id}: ${res.status}`);
        } else {
          const res = await fetch(`${origin}/api/n8n/create-draft`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader },
            body: JSON.stringify({ queue_id: item.id }),
          });
          if (res.ok) processed++;
          else errors.push(`draft ${item.id}: ${res.status}`);
        }
      } catch (e: unknown) {
        errors.push(`item ${item.id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      total: items.length,
      errors: errors.length ? errors : undefined,
    });
  } catch (error: unknown) {
    console.error('[cron] process-email-queue error:', error);
    return NextResponse.json(
      { error: 'Failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
