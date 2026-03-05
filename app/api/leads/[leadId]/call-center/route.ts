import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { updateLeadCallCenter } from '@/lib/supabase-leads';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { leadId } = await params;
    if (!leadId) return NextResponse.json({ error: 'leadId required' }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const updates: { call_notes?: string | null; called?: boolean; comments?: string | null; folder_id?: string | null } = {};
    if (body.call_notes !== undefined) updates.call_notes = body.call_notes == null ? null : String(body.call_notes);
    if (body.called !== undefined) updates.called = Boolean(body.called);
    if (body.comments !== undefined) updates.comments = body.comments == null ? null : String(body.comments);
    if (body.folder_id !== undefined) updates.folder_id = body.folder_id == null || body.folder_id === '' ? null : body.folder_id;

    const ok = await updateLeadCallCenter(user.id, leadId, updates);
    if (!ok) return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('PATCH /api/leads/[leadId]/call-center:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
