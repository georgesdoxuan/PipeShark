import { NextResponse } from 'next/server';
import { getUsersWithScheduleMatchingNow, getScheduleCampaignIdsAdmin } from '@/lib/supabase-schedule';
import { getCampaignsForUserAdmin, getCampaignsByIdsAdmin } from '@/lib/supabase-campaigns';
import { getRandomCityFromSupabase } from '@/lib/supabase-cities';
import { countLeadsForCampaignAdmin } from '@/lib/supabase-leads';
import { createAdminClient } from '@/lib/supabase-server';
import { getValidGmailAccessToken } from '@/lib/gmail';
import { triggerN8nWorkflow } from '@/lib/n8n';

const POLL_LEADS_INTERVAL_MS = 15_000;
const WAIT_FOR_LEADS_TIMEOUT_MS = 15 * 60 * 1000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Wait until campaign has at least targetCount leads, or timeout. */
async function waitForCampaignLeads(
  userId: string,
  campaignId: string,
  targetCount: number
): Promise<void> {
  const deadline = Date.now() + WAIT_FOR_LEADS_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const count = await countLeadsForCampaignAdmin(userId, campaignId);
    if (count >= targetCount) {
      console.log(`[cron] Campaign ${campaignId} has ${count}/${targetCount} leads, proceeding`);
      return;
    }
    await delay(POLL_LEADS_INTERVAL_MS);
  }
  console.log(`[cron] Timeout waiting for campaign ${campaignId} (wanted ${targetCount} leads), proceeding anyway`);
}

export async function GET(request: Request) {
  console.log('[cron] launch-scheduled-campaigns called');
  const { searchParams } = new URL(request.url);
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    const querySecret = searchParams.get('secret');
    const isValid =
      authHeader === `Bearer ${cronSecret}` || querySecret === cronSecret;
    if (!isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const simulateTime = searchParams.get('simulateTime') || undefined;

  try {
    const { userIds, currentTimeUtc } = await getUsersWithScheduleMatchingNow(simulateTime);
    const results: { userId: string; campaignsLaunched: number; errors: string[] }[] = [];

    const admin = createAdminClient();

    for (const userId of userIds) {
      const errors: string[] = [];
      let campaignsLaunched = 0;

      try {
        const { data: userProfile } = await admin
          .from('user_profiles')
          .select('gmail_access_token, gmail_refresh_token, gmail_email, gmail_token_expiry, gmail_connected')
          .eq('id', userId)
          .single();

        if (!userProfile?.gmail_connected || !userProfile.gmail_access_token || !userProfile.gmail_refresh_token) {
          errors.push('Gmail not connected - connect Gmail in the dashboard');
          results.push({ userId, campaignsLaunched: 0, errors });
          continue;
        }

        let gmailAccessToken: string;
        try {
          gmailAccessToken = await getValidGmailAccessToken(
            userProfile.gmail_access_token,
            userProfile.gmail_refresh_token,
            userProfile.gmail_token_expiry,
            userId
          );
        } catch (tokenErr: any) {
          errors.push(`Gmail token: ${tokenErr.message}`);
          results.push({ userId, campaignsLaunched: 0, errors });
          continue;
        }

        const scheduledIds = await getScheduleCampaignIdsAdmin(userId);
        const campaigns =
          scheduledIds.length > 0
            ? await getCampaignsByIdsAdmin(userId, scheduledIds)
            : await getCampaignsForUserAdmin(userId);

        for (let i = 0; i < campaigns.length; i++) {
          const campaign = campaigns[i];
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
              mode: campaign.mode ?? 'local_businesses',
              gmailAccessToken,
              gmailRefreshToken: userProfile.gmail_refresh_token,
              gmailEmail: userProfile.gmail_email || undefined,
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
            await waitForCampaignLeads(userId, campaign.id, targetCount);
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
      currentTimeUtc,
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
