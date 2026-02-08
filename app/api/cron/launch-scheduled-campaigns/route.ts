import { NextResponse } from 'next/server';
import { getUsersWithScheduleMatchingNow } from '@/lib/supabase-schedule';
import { getCampaignsForUserAdmin } from '@/lib/supabase-campaigns';
import { getRandomCityFromSupabase } from '@/lib/supabase-cities';
import { triggerN8nWorkflow } from '@/lib/n8n';

export async function GET(request: Request) {
  // Verify cron secret (optional - set CRON_SECRET in env for production)
  // Supports: Authorization: Bearer <secret> OR ?secret=<secret> (for Vercel Cron)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    const querySecret = searchParams.get('secret');
    const isValid =
      authHeader === `Bearer ${cronSecret}` || querySecret === cronSecret;
    if (!isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const userIds = await getUsersWithScheduleMatchingNow();
    const results: { userId: string; campaignsLaunched: number; errors: string[] }[] = [];

    for (const userId of userIds) {
      const errors: string[] = [];
      let campaignsLaunched = 0;

      try {
        const campaigns = await getCampaignsForUserAdmin(userId);

        for (const campaign of campaigns) {
          const targetCount = campaign.numberCreditsUsed ?? 0;
          if (targetCount <= 0) continue;

          try {
            const payload: Parameters<typeof triggerN8nWorkflow>[0] = {
              userId,
              campaignId: campaign.id,
              businessType: campaign.businessType,
              companyDescription: campaign.companyDescription,
              toneOfVoice: campaign.toneOfVoice || 'professional',
              campaignGoal: campaign.campaignGoal || 'book_call',
              magicLink: campaign.magicLink || '',
              targetCount,
            };
            if (campaign.cities && campaign.cities.length > 0) {
              payload.cities = campaign.cities;
            } else {
              const size = campaign.citySize || '1M+';
              const picked = await getRandomCityFromSupabase(size);
              if (picked) {
                payload.cities = [picked.name];
                payload.country = picked.country;
              } else {
                payload.citySize = size;
              }
            }

            await triggerN8nWorkflow(payload);
            campaignsLaunched++;
          } catch (err: any) {
            errors.push(`Campaign ${campaign.businessType}: ${err.message}`);
          }
        }
      } catch (err: any) {
        errors.push(`User ${userId}: ${err.message}`);
      }

      results.push({ userId, campaignsLaunched, errors });
    }

    return NextResponse.json({
      success: true,
      usersProcessed: userIds.length,
      results,
    });
  } catch (error: any) {
    console.error('Cron launch-scheduled-campaigns error:', error);
    return NextResponse.json(
      { error: 'Cron failed', details: error.message },
      { status: 500 }
    );
  }
}
