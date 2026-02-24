import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { updateLeadDraft } from '@/lib/supabase-leads';
import { updatePendingQueueDraftByLeadId } from '@/lib/supabase-email-queue';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const { leadId } = await params;
    if (!leadId) {
      return NextResponse.json({ error: 'Missing leadId' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
    const bodyText = typeof body.body === 'string' ? body.body : '';

    const draftContent = subject && bodyText
      ? `${subject}\n\n${bodyText}`
      : subject || bodyText || '';

    const ok = await updateLeadDraft(user.id, leadId, draftContent);
    if (!ok) {
      return NextResponse.json({ error: 'Failed to update lead draft' }, { status: 500 });
    }

    const queueUpdated = await updatePendingQueueDraftByLeadId(user.id, leadId, subject || '(No subject)', bodyText);

    return NextResponse.json({
      success: true,
      queueUpdated: queueUpdated > 0,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update draft';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
