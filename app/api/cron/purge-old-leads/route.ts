/**
 * GET /api/cron/purge-old-leads
 * GDPR compliance: strips PII from leads that have not replied and are older than 30 days.
 * Rows are kept (not deleted) so analytics counts (email_sent, replied) remain accurate.
 * PII nulled: email, phone, name, url, draft, linkedin, gmail_thread_id,
 *             preparation_summary, call_notes, comments.
 * Protected by CRON_SECRET.
 */
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

const BATCH_SIZE = 200;
const RETENTION_DAYS = 30;

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
    const supabase = createAdminClient();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
    const cutoffIso = cutoff.toISOString();

    // Find leads eligible for GDPR purge:
    // - not replied (replied IS NULL or false)
    // - older than RETENTION_DAYS (using created_at as source of truth)
    // - not already purged
    const { data: leads, error: fetchError } = await supabase
      .from('leads')
      .select('id')
      .is('gdpr_purged_at', null)
      .neq('replied', true)
      .lt('created_at', cutoffIso)
      .limit(BATCH_SIZE);

    if (fetchError) {
      console.error('[purge-old-leads] fetch error:', fetchError.message);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json({ purged: 0 });
    }

    const ids = leads.map((l: { id: string }) => l.id);

    const { error: updateError } = await supabase
      .from('leads')
      .update({
        email: null,
        phone: null,
        name: null,
        url: null,
        draft: null,
        linkedin: null,
        gmail_thread_id: null,
        preparation_summary: null,
        call_notes: null,
        comments: null,
        gdpr_purged_at: new Date().toISOString(),
      })
      .in('id', ids);

    if (updateError) {
      console.error('[purge-old-leads] update error:', updateError.message);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    console.log(`[purge-old-leads] purged PII for ${ids.length} leads`);
    return NextResponse.json({ purged: ids.length });
  } catch (err: any) {
    console.error('[purge-old-leads] unexpected error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
