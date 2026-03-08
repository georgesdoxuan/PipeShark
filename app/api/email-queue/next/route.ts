import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/email-queue/next
 * Returns next pending send time + today's sent breakdown by delivery_type.
 */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const now = new Date().toISOString();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [nextRow, todayRows] = await Promise.all([
    supabase
      .from('email_queue')
      .select('scheduled_at')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .gte('scheduled_at', now)
      .order('scheduled_at', { ascending: true })
      .limit(1)
      .single(),
    supabase
      .from('email_queue')
      .select('delivery_type')
      .eq('user_id', user.id)
      .eq('status', 'sent')
      .gte('updated_at', todayStart.toISOString()),
  ]);

  const rows = todayRows.data ?? [];
  const sentCount = rows.filter(r => r.delivery_type === 'send').length;
  const draftCount = rows.filter(r => r.delivery_type === 'draft').length;

  return NextResponse.json({
    nextAt: nextRow.data?.scheduled_at ?? null,
    sentToday: sentCount,
    draftToday: draftCount,
  });
}
