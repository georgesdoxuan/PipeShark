import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * PATCH /api/leads/queue-delivery-type
 * Body: { queueItemId: string, deliveryType: 'send' | 'draft' }
 * Update delivery_type of a pending email_queue row.
 */
export async function PATCH(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { queueItemId?: string; deliveryType?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { queueItemId, deliveryType } = body;
  if (!queueItemId) return NextResponse.json({ error: 'Missing queueItemId' }, { status: 400 });
  if (deliveryType !== 'send' && deliveryType !== 'draft') {
    return NextResponse.json({ error: 'deliveryType must be send or draft' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('email_queue')
    .update({ delivery_type: deliveryType, updated_at: new Date().toISOString() })
    .eq('id', queueItemId)
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .select('id, delivery_type')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Update failed or item not found' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deliveryType: data.delivery_type });
}
