import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getLeadsForUser } from '@/lib/supabase-leads';
import { getQueueInfoForLeads } from '@/lib/supabase-email-queue';

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId') || undefined;

    const leads = await getLeadsForUser(user.id, campaignId);
    const queueInfo = await getQueueInfoForLeads(user.id, leads.map((l) => ({ id: l.id, email: l.email ?? null })));

    const leadsWithQueue = leads.map((lead) => ({
      ...lead,
      deliveryType: queueInfo[lead.id]?.delivery_type ?? null,
      scheduledAt: queueInfo[lead.id]?.scheduled_at ?? null,
    }));

    return NextResponse.json(leadsWithQueue);
  } catch (error: any) {
    console.error('Error fetching leads:', error.message);
    return NextResponse.json(
      { error: 'Failed to fetch leads', details: error.message },
      { status: 500 }
    );
  }
}
