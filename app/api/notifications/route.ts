import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getNotificationsForUser } from '@/lib/supabase-leads';
import { getCampaignsForUser } from '@/lib/supabase-campaigns';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await getNotificationsForUser(user.id);
    const campaigns = await getCampaignsForUser(user.id);
    const campaignNames: Record<string, string> = {};
    for (const c of campaigns) {
      campaignNames[c.id] = c.name || c.businessType || c.id;
    }

    const recentRepliesWithNames = data.recentReplies.map((r) => ({
      ...r,
      campaignName: r.campaign_id ? campaignNames[r.campaign_id] ?? null : null,
    }));

    const firstToday = data.todayLeads[0];
    const firstTodayCampaignId = firstToday?.campaign_id ?? null;
    const todayCampaignName = firstTodayCampaignId ? (campaignNames[firstTodayCampaignId] ?? null) : null;
    const todayLeadLabel = !todayCampaignName && firstToday?.business_type
      ? firstToday.business_type
      : null;

    return NextResponse.json({
      todayLeadsCount: data.todayLeadsCount,
      todayLeads: data.todayLeads,
      todayCampaignName,
      todayLeadLabel,
      recentReplies: recentRepliesWithNames,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch notifications';
    console.error('Notifications API:', message);
    return NextResponse.json(
      { error: 'Failed to fetch notifications', details: message },
      { status: 500 }
    );
  }
}
