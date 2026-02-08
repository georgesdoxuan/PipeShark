import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSchedule, setSchedule } from '@/lib/supabase-schedule';
import { getCampaignsForUser } from '@/lib/supabase-campaigns';

const DAILY_LIMIT = 300;

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const schedule = await getSchedule(user.id);
    return NextResponse.json({
      launchTime: schedule.launchTime,
      campaignIds: schedule.campaignIds,
    });
  } catch (error: any) {
    console.error('Error fetching schedule:', error.message);
    return NextResponse.json(
      { error: 'Failed to fetch schedule', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { launchTime, campaignIds } = body;

    if (!launchTime || typeof launchTime !== 'string') {
      return NextResponse.json(
        { error: 'launchTime is required (format HH:MM)' },
        { status: 400 }
      );
    }

    const match = launchTime.match(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/);
    if (!match) {
      return NextResponse.json(
        { error: 'launchTime must be in HH:MM format (e.g. 17:43)' },
        { status: 400 }
      );
    }

    let ids: string[] = [];
    if (campaignIds !== undefined) {
      if (!Array.isArray(campaignIds)) {
        return NextResponse.json(
          { error: 'campaignIds must be an array of campaign IDs' },
          { status: 400 }
        );
      }
      ids = campaignIds.filter((id: unknown): id is string => typeof id === 'string');
      const userCampaigns = await getCampaignsForUser(user.id);
      const userCampaignIds = new Set(userCampaigns.map((c) => c.id));
      const invalid = ids.filter((id) => !userCampaignIds.has(id));
      if (invalid.length > 0) {
        return NextResponse.json(
          { error: 'Some campaign IDs do not belong to you', invalid },
          { status: 400 }
        );
      }
      const campaignsToSum = userCampaigns.filter((c) => ids.includes(c.id));
      const totalCredits = campaignsToSum.reduce((acc, c) => acc + (c.numberCreditsUsed ?? 0), 0);
      if (totalCredits > DAILY_LIMIT) {
        return NextResponse.json(
          {
            error: `Total credits (${totalCredits}) exceeds daily limit (${DAILY_LIMIT}). Reduce the number of campaigns or their target count.`,
          },
          { status: 400 }
        );
      }
    }

    await setSchedule(user.id, launchTime, ids);
    return NextResponse.json({
      success: true,
      launchTime,
      campaignIds: ids,
    });
  } catch (error: any) {
    console.error('Error setting schedule:', error.message);
    return NextResponse.json(
      { error: 'Failed to set schedule', details: error.message },
      { status: 500 }
    );
  }
}
