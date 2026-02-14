import { NextResponse } from 'next/server';
import { getScheduledCampaignRunsNow } from '@/lib/supabase-schedule';
import { getCampaignsByIdsAdmin } from '@/lib/supabase-campaigns';
import { getRandomCityFromSupabase } from '@/lib/supabase-cities';
import { countLeadsForCampaignAdmin } from '@/lib/supabase-leads';
import { createAdminClient } from '@/lib/supabase-server';
import { getValidGmailAccessToken } from '@/lib/gmail';
import { triggerN8nWorkflow } from '@/lib/n8n';

const POLL_LEADS_INTERVAL_MS = 15_000; // poll every 15s
const WAIT_FOR_LEADS_TIMEOUT_MS = 2 * 60 * 1000; // max 2 min per campaign so cron can launch several within serverless timeout

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
    const { runs, currentTimeUtc } = await getScheduledCampaignRunsNow(simulateTime);
    const results: { userId: string; campaignId: string; slotIndex: number; launched: boolean; error?: string }[] = [];
    const admin = createAdminClient();

    for (const run of runs) {
      const { userId, campaignId, slotIndex } = run;

      try {
        const campaigns = await getCampaignsByIdsAdmin(userId, [campaignId]);
        const campaign = campaigns[0];
        if (!campaign || campaign.status !== 'active') {
          results.push({ userId, campaignId, slotIndex, launched: false, error: 'Campaign not found or inactive' });
          continue;
        }

        const targetCount = campaign.numberCreditsUsed ?? 0;
        if (targetCount <= 0) {
          results.push({ userId, campaignId, slotIndex, launched: false, error: 'targetCount 0' });
          continue;
        }

        const { data: userProfile } = await admin
          .from('user_profiles')
          .select('gmail_access_token, gmail_refresh_token, gmail_email, gmail_token_expiry, gmail_connected')
          .eq('id', userId)
          .single();

        if (!userProfile?.gmail_connected || !userProfile.gmail_access_token || !userProfile.gmail_refresh_token) {
          results.push({ userId, campaignId, slotIndex, launched: false, error: 'Gmail not connected' });
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
          results.push({ userId, campaignId, slotIndex, launched: false, error: `Gmail: ${tokenErr.message}` });
          continue;
        }

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
          if (campaign.cities.length === 1) payload.city = campaign.cities[0];
        } else {
          const size = campaign.citySize || '1M+';
          const picked = await getRandomCityFromSupabase(size);
          if (picked) {
            payload.cities = [picked.name];
            payload.country = picked.country;
            payload.city = picked.name;
          } else {
            payload.citySize = size;
          }
        }

        console.log(`[cron] Launching campaign slot ${slotIndex + 1}: ${campaign.businessType} (${payload.cities?.[0] ?? payload.citySize}) for user ${userId}`);
        await triggerN8nWorkflow(payload);
        await waitForCampaignLeads(userId, campaign.id, targetCount);
        results.push({ userId, campaignId, slotIndex, launched: true });
      } catch (err: any) {
        console.error(`[cron] Run failed:`, err.message);
        results.push({ userId, campaignId, slotIndex, launched: false, error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      currentTimeUtc,
      runsProcessed: runs.length,
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
