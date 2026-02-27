import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getCampaignById } from '@/lib/supabase-campaigns';
import { getSchedule } from '@/lib/supabase-schedule';
import { enqueueCampaignLeadsForUser } from '@/lib/supabase-email-queue';

/**
 * POST /api/schedule/enqueue
 * Add to send queue: enqueue leads from the given campaigns (must belong to the user).
 * Body: { campaignIds: string[] }
 * Used by the "Add to send queue" button next to Daily launch (applies to scheduled campaigns).
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const campaignIds = Array.isArray(body.campaignIds) ? body.campaignIds : [];
    if (campaignIds.length === 0) {
      return NextResponse.json(
        { error: 'No campaigns selected', enqueued: 0, perCampaign: {} },
        { status: 400 }
      );
    }

    const schedule = await getSchedule(user.id);
    const deliveryType = schedule.launchDeliveryMode === 'drafts' ? 'draft' : 'send';

    const perCampaign: Record<string, number> = {};
    let totalEnqueued = 0;

    for (const campaignId of campaignIds) {
      if (typeof campaignId !== 'string' || !campaignId.trim()) continue;
      const campaign = await getCampaignById(user.id, campaignId.trim());
      if (!campaign) continue;
      try {
        const count = await enqueueCampaignLeadsForUser(user.id, campaignId.trim(), {
          deliveryType,
        });
        perCampaign[campaignId] = count;
        totalEnqueued += count;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Enqueue failed';
        return NextResponse.json(
          { error: `Campaign ${campaignId}: ${message}`, enqueued: totalEnqueued, perCampaign },
          { status: 200 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      enqueued: totalEnqueued,
      perCampaign,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to enqueue';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
