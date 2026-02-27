import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * PATCH /api/messages/queue-item
 * Body: { queueId, subject, body }
 * Update subject and body of a pending queue item (for editing before scheduled send).
 * RLS ensures user can only update their own rows.
 */
export async function PATCH(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { queueId?: string; subject?: string; body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { queueId, subject, body: bodyText } = body;
  if (!queueId || typeof queueId !== 'string') {
    return NextResponse.json({ error: 'Missing queueId' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('email_queue')
    .update({
      subject: (subject ?? '').trim() || '(No subject)',
      body: (bodyText ?? '').trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', queueId)
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .select('id, subject, body, scheduled_at')
    .single();

  if (error) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Queue item not found or already sent' }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    queueItem: {
      id: data.id,
      subject: data.subject,
      body: data.body,
      scheduled_at: data.scheduled_at,
    },
  });
}
