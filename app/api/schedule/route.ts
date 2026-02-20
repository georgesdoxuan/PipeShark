import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSchedule, setSchedule } from '@/lib/supabase-schedule';
import { getCampaignsForUser } from '@/lib/supabase-campaigns';
import { countTodayLeadsForUser } from '@/lib/supabase-leads';
import { getDailyLimitForUser } from '@/lib/supabase-user-plan';

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
      timezone: schedule.timezone,
      launchDeliveryMode: schedule.launchDeliveryMode,
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
    const { launchTime, campaignIds, timezone: tzParam, launchDeliveryMode: deliveryModeParam } = body;

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
    // Store always as HH:MM (e.g. 09:00) so cron matching works
    const hour = match[1].padStart(2, '0');
    const minute = match[2];
    const normalizedLaunchTime = `${hour}:${minute}`;

    // Validate IANA timezone if provided (e.g. Europe/Paris)
    let timezone: string | null = null;
    if (tzParam != null && typeof tzParam === 'string' && tzParam.trim()) {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: tzParam.trim() });
        timezone = tzParam.trim();
      } catch {
        return NextResponse.json(
          { error: 'Invalid timezone (use IANA name, e.g. Europe/Paris)' },
          { status: 400 }
        );
      }
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
      const usedToday = await countTodayLeadsForUser(user.id);
      const dailyLimit = await getDailyLimitForUser(user.id);
      if (usedToday + totalCredits > dailyLimit) {
        return NextResponse.json(
          {
            error: `You have ${dailyLimit - usedToday} credits left today. Selected campaigns total ${totalCredits} credits. Reduce the selection or target counts.`,
          },
          { status: 400 }
        );
      }
    }

    const deliveryMode =
      deliveryModeParam === 'drafts' || deliveryModeParam === 'queue' ? deliveryModeParam : undefined;
    await setSchedule(user.id, normalizedLaunchTime, ids, timezone, deliveryMode);
    const schedule = await getSchedule(user.id);
    return NextResponse.json({
      success: true,
      launchTime: normalizedLaunchTime,
      campaignIds: ids,
      timezone,
      launchDeliveryMode: schedule.launchDeliveryMode,
    });
  } catch (error: any) {
    console.error('Error setting schedule:', error.message);
    return NextResponse.json(
      { error: 'Failed to set schedule', details: error.message },
      { status: 500 }
    );
  }
}
