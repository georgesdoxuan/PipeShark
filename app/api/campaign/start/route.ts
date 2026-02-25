import { NextResponse } from 'next/server';
import { triggerN8nWorkflow } from '@/lib/n8n';
import { createCampaign, getCampaignById, updateCampaign, unlinkLeadsFromCampaign } from '@/lib/supabase-campaigns';
import { countTodayLeadsForUser } from '@/lib/supabase-leads';
import { getCitiesFromSupabase, getRandomCityFromSupabase } from '@/lib/supabase-cities';
import { addCompanyDescription } from '@/lib/supabase-company-descriptions';
import { addEmailTemplate } from '@/lib/supabase-email-templates';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getValidGmailAccessToken } from '@/lib/gmail';
import { getDailyLimitForUser } from '@/lib/supabase-user-plan';
import { getGmailTokensForEmail, listGmailAccountsForUser } from '@/lib/supabase-gmail-accounts';
import { getUserPlanInfo } from '@/lib/supabase-user-plan';

const MAX_PER_CAMPAIGN_ABSOLUTE = 300;

export async function POST(request: Request) {
  console.log('\n=== CAMPAIGN START API CALLED ===');
  console.log('Timestamp:', new Date().toISOString());

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { businessType, cities, citySize, companyDescription, toneOfVoice, campaignGoal, magicLink, campaignId, targetCount, name, mode, exampleEmail, country, gmailEmail: bodyGmailEmail, businessLinkText } = body;

    const planInfo = await getUserPlanInfo(user.id);
    const isPro = planInfo.plan === 'pro';

    // Re-run: load existing campaign early (for Gmail account resolution and later use)
    let existingCampaign: Awaited<ReturnType<typeof getCampaignById>> = null;
    if (campaignId) {
      existingCampaign = await getCampaignById(user.id, campaignId);
      if (!existingCampaign) {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
      }
    }

    // Resolve which Gmail account to use: re-run = campaign's gmail_email; new campaign = body gmail_email (Pro) or primary (Standard/trial)
    let gmailEmailForTokens: string | null = null;
    if (campaignId && existingCampaign) {
      gmailEmailForTokens = existingCampaign.gmailEmail ?? null;
    } else {
      if (isPro && bodyGmailEmail != null && String(bodyGmailEmail).trim()) {
        const accounts = await listGmailAccountsForUser(user.id);
        const connected = accounts.filter((a) => a.connected);
        const match = connected.find((a) => a.email.toLowerCase() === String(bodyGmailEmail).trim().toLowerCase());
        if (!match) {
          return NextResponse.json(
            { error: 'Selected Gmail account not found or not connected. Choose one of your connected accounts.' },
            { status: 400 }
          );
        }
        gmailEmailForTokens = match.email;
      }
      // else Standard/trial: gmailEmailForTokens stays null = primary
    }

    const userProfile = await getGmailTokensForEmail(user.id, gmailEmailForTokens);
    if (!userProfile?.gmail_access_token || !userProfile.gmail_refresh_token) {
      return NextResponse.json(
        {
          error: 'Please connect your Gmail account before starting a campaign',
          hint: 'Go to the dashboard and click "Connect Gmail"',
        },
        { status: 400 }
      );
    }

    let accessToken = userProfile.gmail_access_token;
    try {
      accessToken = await getValidGmailAccessToken(
        userProfile.gmail_access_token,
        userProfile.gmail_refresh_token,
        userProfile.gmail_token_expiry,
        user.id,
        userProfile.gmail_email
      );
    } catch (tokenError) {
      console.error('Gmail token refresh failed:', tokenError);
      return NextResponse.json(
        {
          error: 'Could not refresh Gmail token. Please reconnect Gmail from the dashboard.',
        },
        { status: 400 }
      );
    }

    // Validation
    if (!businessType || typeof businessType !== 'string' || !businessType.trim()) {
      return NextResponse.json(
        {
          error: 'businessType is required and must be a non-empty string',
        },
        { status: 400 }
      );
    }

    // Use existing campaign description if not provided in body (for "Run" button)
    const finalCompanyDescription = companyDescription?.trim() || existingCampaign?.companyDescription || '';

    // Validate company description (required for new campaigns only)
    if (!campaignId) {
      if (!companyDescription || typeof companyDescription !== 'string' || !companyDescription.trim()) {
        return NextResponse.json(
          {
            error: 'Company description is required',
          },
          { status: 400 }
        );
      }

      if (companyDescription.trim().length < 50) {
        return NextResponse.json(
          {
            error: 'Company description must be at least 50 characters',
          },
          { status: 400 }
        );
      }

      if (companyDescription.length > 500) {
        return NextResponse.json(
          {
            error: 'Company description must be less than 500 characters',
          },
          { status: 400 }
        );
      }
    }
    if (campaignId) {
      // Re-run: optional description override
      if (companyDescription && companyDescription.trim()) {
        if (companyDescription.trim().length < 50) {
          return NextResponse.json(
            {
              error: 'Company description must be at least 50 characters',
            },
            { status: 400 }
          );
        }

        if (companyDescription.length > 500) {
          return NextResponse.json(
            {
              error: 'Company description must be less than 500 characters',
            },
            { status: 400 }
          );
        }
      }
    }

    // Validate cities if provided
    if (cities !== undefined && !Array.isArray(cities)) {
      return NextResponse.json(
        {
          error: 'cities must be an array of strings',
        },
        { status: 400 }
      );
    }

    // Validate citySize if provided
    if (citySize !== undefined && typeof citySize !== 'string') {
      return NextResponse.json(
        {
          error: 'citySize must be a string',
        },
        { status: 400 }
      );
    }

    console.log('📋 Campaign parameters:');
    console.log('   - businessType:', businessType);
    console.log('   - companyDescription:', finalCompanyDescription ? finalCompanyDescription.substring(0, 50) + '...' : 'none');
    console.log('   - toneOfVoice:', toneOfVoice || 'none');
    console.log('   - campaignGoal:', campaignGoal || 'none');
    console.log('   - magicLink:', magicLink || 'none');
    console.log('   - cities:', cities || 'none');
    console.log('   - citySize:', citySize || 'none');

    const campaignMode = mode === 'local_businesses' ? 'local_businesses' : 'standard';
    const webhookEnvVar = campaignMode === 'local_businesses' ? 'N8N_WEBHOOK_URL_LOCAL_BUSINESSES' : 'N8N_WEBHOOK_URL';
    const webhookUrl = campaignMode === 'local_businesses'
      ? process.env.N8N_WEBHOOK_URL_LOCAL_BUSINESSES
      : process.env.N8N_WEBHOOK_URL;

    if (!webhookUrl) {
      console.error(`❌ ${webhookEnvVar} is not configured`);
      return NextResponse.json(
        {
          error: `${webhookEnvVar} is not configured`,
          hint: 'Check your .env.local file',
        },
        { status: 500 }
      );
    }

    const dailyLimit = await getDailyLimitForUser(user.id);
    const maxPerCampaign = Math.min(MAX_PER_CAMPAIGN_ABSOLUTE, dailyLimit);

    if (!campaignId && dailyLimit === 0) {
      return NextResponse.json(
        {
          error: 'Free trial ended',
          details: 'Upgrade to Standard to keep sending campaigns. Go to Pricing to subscribe.',
        },
        { status: 403 }
      );
    }

    // For new campaigns: targetCount is required (1–maxPerCampaign) for Daily Credits. Re-run does not consume new credits.
    const creditsToUse = !campaignId && typeof targetCount === 'number'
      ? Math.min(maxPerCampaign, Math.max(1, Math.round(targetCount)))
      : 0;
    if (!campaignId) {
      if (creditsToUse < 1) {
        return NextResponse.json(
          { error: `targetCount is required for new campaigns (1-${maxPerCampaign})` },
          { status: 400 }
        );
      }
      const usedToday = await countTodayLeadsForUser(user.id);
      if (usedToday + creditsToUse > dailyLimit) {
        return NextResponse.json(
          {
            error: 'Daily quota exceeded',
            details: `You have ${dailyLimit - usedToday} credits remaining today. This campaign requires ${creditsToUse} credits.`,
          },
          { status: 400 }
        );
      }
    }

    // Re-run: use existing campaign so new leads go into the SAME campaign. New campaign: create one row.
    let campaign;
    if (campaignId && existingCampaign) {
      campaign = existingCampaign;
      console.log('📝 Re-run: using existing campaign', campaign.id, '- new leads will be attached to this campaign');
    } else {
      // New campaign - create it in Supabase with number_credits_used
      campaign = await createCampaign(user.id, {
        name: name?.trim() || undefined,
        businessType: businessType.trim(),
        companyDescription: finalCompanyDescription.trim(),
        toneOfVoice: toneOfVoice || 'professional',
        campaignGoal: campaignGoal || 'book_call',
        magicLink: magicLink && magicLink.trim() ? magicLink.trim() : undefined,
        cities: cities && cities.length > 0 ? cities : undefined,
        citySize: cities && cities.length > 0 ? undefined : (citySize || '1M+'),
        mode: campaignMode,
        numberCreditsUsed: creditsToUse,
        status: 'active',
        gmailEmail: gmailEmailForTokens,
      });
      console.log('📝 Campaign created:', campaign.id, campaign.businessType, 'credits:', creditsToUse);
    }

    // Use campaign's mode for existing campaigns (from DB), or campaignMode for new ones
    const effectiveMode = campaign.mode || campaignMode;

    // Prepare payload: if cities are specified, don't send citySize
    const payload: any = {
      userId: user.id,
      campaignId: campaign.id,
      businessType: businessType.trim(),
      companyDescription: finalCompanyDescription.trim(),
      toneOfVoice: toneOfVoice || 'professional',
      campaignGoal: campaignGoal || 'book_call',
      magicLink: magicLink?.trim() || '',
      mode: effectiveMode,
      gmailAccessToken: accessToken,
      gmailRefreshToken: userProfile.gmail_refresh_token,
      gmailEmail: userProfile.gmail_email || undefined,
    };
    if (exampleEmail && typeof exampleEmail === 'string' && exampleEmail.trim()) {
      payload.exampleEmail = exampleEmail.trim();
    }
    if (businessLinkText && typeof businessLinkText === 'string' && businessLinkText.trim()) {
      payload.businessLinkText = businessLinkText.trim();
    }
    const effectiveTargetCount =
      typeof targetCount === 'number' && targetCount >= 1
        ? targetCount
        : campaignId && existingCampaign?.numberCreditsUsed != null
          ? existingCampaign.numberCreditsUsed
          : targetCount;
    if (typeof effectiveTargetCount === 'number' && effectiveTargetCount >= 1) {
      payload.targetCount = Math.min(maxPerCampaign, effectiveTargetCount);
    }

    const effectiveCitySize = citySize || existingCampaign?.citySize || '1M+';

    // Re-run: use the campaign's current city if it's already a single city (what the user sees). Otherwise draw one.
    const singleCityFromRequest = Array.isArray(cities) && cities.length === 1 ? cities[0] : undefined;
    const singleCityFromCampaign = existingCampaign?.cities?.length === 1 ? existingCampaign.cities[0] : undefined;
    const cityToUse = singleCityFromRequest ?? singleCityFromCampaign;

    if (campaignId && effectiveCitySize) {
      if (cityToUse && typeof cityToUse === 'string' && cityToUse.trim()) {
        // Use the city already shown (from request or campaign) – do not re-draw
        const cityName = cityToUse.trim();
        payload.cities = [cityName];
        payload.city = cityName;
        if (country && typeof country === 'string' && country.trim()) {
          payload.country = country.trim();
        } else {
          const cityRow = (await getCitiesFromSupabase(effectiveCitySize)).find(
            (c) => c.name.trim().toLowerCase() === cityName.toLowerCase()
          );
          if (cityRow) payload.country = cityRow.country;
        }
        console.log('   - Re-run: using existing city (no re-draw):', cityName, payload.country || '');
      } else {
        // No single city yet: draw one random city
        const picked = await getRandomCityFromSupabase(effectiveCitySize);
        if (picked) {
          payload.cities = [picked.name];
          payload.country = picked.country;
          payload.city = picked.name;
          console.log('   - Re-run: random city from', effectiveCitySize, '->', picked.name, picked.country);
          await updateCampaign(user.id, campaign.id, { cities: [picked.name] });
        } else {
          const citiesFromDb = await getCitiesFromSupabase(effectiveCitySize);
          payload.cities = citiesFromDb.map((c) => c.name);
          if (citiesFromDb.length === 0) {
            console.warn('No cities in Supabase for citySize:', effectiveCitySize, '- n8n may use fallback');
          }
        }
      }
    } else if (cities && cities.length > 0) {
      payload.cities = Array.isArray(cities) ? cities : [cities];
      if (country && typeof country === 'string' && country.trim()) {
        payload.country = country.trim();
      }
    } else {
      // No cities specified (e.g. first run): fetch all cities for citySize and let n8n use them
      const size = citySize || '1M+';
      const citiesFromDb = await getCitiesFromSupabase(size);
      payload.cities = citiesFromDb.map((c) => c.name);
      if (citiesFromDb.length === 0) {
        console.warn('No cities in Supabase for citySize:', size, '- n8n may use fallback');
      }
    }

    // Re-run: block double launch (double-click = duplicate leads). Short cooldown so CampaignForm retries (after polling) still work.
    const COOLDOWN_MS = 15 * 1000; // 15 seconds
    if (campaignId && existingCampaign?.lastStartedAt) {
      const elapsed = Date.now() - new Date(existingCampaign.lastStartedAt).getTime();
      if (elapsed < COOLDOWN_MS) {
        return NextResponse.json(
          {
            error: 'Campaign was just started',
            hint: 'Please wait a few seconds before running again.',
          },
          { status: 429 }
        );
      }
    }
    if (campaignId && existingCampaign) {
      await updateCampaign(user.id, campaign.id, { lastStartedAt: new Date().toISOString() });
    }

    // Re-run: unlink previous leads from this campaign so it only shows leads from this run (e.g. Sydney only, not Sydney + New York)
    if (campaignId && existingCampaign) {
      await unlinkLeadsFromCampaign(user.id, campaign.id);
      console.log('   - Unlinked previous leads from campaign so only this run’s leads will show');
    }

    // Trigger n8n workflow with parameters
    console.log('🚀 Triggering n8n workflow...');
    try {
      await triggerN8nWorkflow(payload);
      console.log('✅ N8N workflow triggered successfully');
    } catch (error: any) {
      console.error('⚠️ Error triggering workflow:', error);
      // Don't fail the request if workflow trigger fails, but log it
      // The workflow might still work even if there's a timeout
    }

    // Save company description to reusable library (if valid)
    if (finalCompanyDescription.trim().length >= 50) {
      try {
        const displayName = campaign.name?.trim() || campaign.businessType;
        await addCompanyDescription(user.id, finalCompanyDescription.trim(), displayName);
      } catch (err) {
        console.warn('Could not save company description:', err);
      }
    }

    // Save example email to templates for reuse (if provided)
    if (exampleEmail && typeof exampleEmail === 'string' && exampleEmail.trim().length > 0) {
      try {
        const templateName = campaign.name?.trim() || campaign.businessType;
        await addEmailTemplate(user.id, exampleEmail.trim(), templateName);
      } catch (err) {
        console.warn('Could not save email template:', err);
      }
    }

    console.log('✅ Campaign started successfully');
    return NextResponse.json({
      success: true,
      message: 'Campaign started successfully',
      campaignId: campaign.id,
      campaign: campaign,
    });
  } catch (error: any) {
    console.error('\n❌ API Error Details:');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);

    return NextResponse.json(
      {
        error: 'Failed to start campaign',
        details: error.message || 'Unknown error',
        hint: 'Check server logs for more details',
      },
      { status: 500 }
    );
  }
}
