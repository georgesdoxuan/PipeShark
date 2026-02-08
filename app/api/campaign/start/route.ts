import { NextResponse } from 'next/server';
import { triggerN8nWorkflow } from '@/lib/n8n';
import { createCampaign, getCampaignById, sumTodayCreditsUsedForUser } from '@/lib/supabase-campaigns';
import { getCitiesFromSupabase, getRandomCityFromSupabase } from '@/lib/supabase-cities';
import { addCompanyDescription } from '@/lib/supabase-company-descriptions';
import { addEmailTemplate } from '@/lib/supabase-email-templates';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getValidGmailAccessToken } from '@/lib/gmail';

const DAILY_LIMIT = 200;
const MAX_PER_CAMPAIGN = 20;

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

    // Check Gmail connection before proceeding
    const { createAdminClient } = await import('@/lib/supabase-server');
    const admin = createAdminClient();
    const { data: userProfile, error: profileError } = await admin
      .from('user_profiles')
      .select('gmail_access_token, gmail_refresh_token, gmail_email, gmail_token_expiry, gmail_connected')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile?.gmail_connected || !userProfile.gmail_access_token) {
      return NextResponse.json(
        {
          error: 'Veuillez connecter votre compte Gmail avant de lancer une campagne',
          hint: 'Allez sur le dashboard et cliquez sur "Connecter Gmail"',
        },
        { status: 400 }
      );
    }

    if (!userProfile.gmail_refresh_token) {
      return NextResponse.json(
        {
          error: 'Token Gmail expiré. Veuillez vous reconnecter à Gmail.',
          hint: 'Déconnectez puis reconnectez Gmail dans le dashboard',
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
        user.id
      );
    } catch (tokenError) {
      console.error('Gmail token refresh failed:', tokenError);
      return NextResponse.json(
        {
          error: 'Impossible de rafraîchir le token Gmail. Veuillez vous reconnecter à Gmail.',
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { businessType, cities, citySize, companyDescription, toneOfVoice, campaignGoal, magicLink, campaignId, targetCount, name, mode, exampleEmail, country } = body;

    // Validation
    if (!businessType || typeof businessType !== 'string' || !businessType.trim()) {
      return NextResponse.json(
        {
          error: 'businessType is required and must be a non-empty string',
        },
        { status: 400 }
      );
    }

    // Get existing campaign if campaignId is provided (for "Run" button)
    let existingCampaign = null;
    if (campaignId) {
      existingCampaign = await getCampaignById(user.id, campaignId);
    }

    // Use existing campaign description if not provided in body (for "Run" button)
    const finalCompanyDescription = companyDescription?.trim() || existingCampaign?.companyDescription || '';

    // Validate company description (required for new campaigns)
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
    } else {
      // For existing campaigns, validate only if description is provided
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

    // For new campaigns: targetCount is required (1-20 max per campaign) for Daily Credits
    const creditsToUse = !campaignId && typeof targetCount === 'number'
      ? Math.min(MAX_PER_CAMPAIGN, Math.max(1, Math.round(targetCount)))
      : 0;
    if (!campaignId) {
      if (creditsToUse < 1) {
        return NextResponse.json(
          { error: `targetCount is required for new campaigns (1-${MAX_PER_CAMPAIGN})` },
          { status: 400 }
        );
      }
      const usedToday = await sumTodayCreditsUsedForUser(user.id);
      if (usedToday + creditsToUse > DAILY_LIMIT) {
        return NextResponse.json(
          {
            error: 'Daily quota exceeded',
            details: `You have ${DAILY_LIMIT - usedToday} credits remaining today. This campaign requires ${creditsToUse} credits.`,
          },
          { status: 400 }
        );
      }
    }

    // Create campaign record only if campaignId is not provided (new campaign)
    let campaign;
    if (campaignId) {
      // Existing campaign - get it from store
      if (!existingCampaign) {
        return NextResponse.json(
          { error: 'Campaign not found' },
          { status: 404 }
        );
      }
      campaign = existingCampaign;
      console.log('📝 Using existing campaign:', campaign.id, campaign.businessType);
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
    const effectiveTargetCount =
      typeof targetCount === 'number' && targetCount >= 1
        ? targetCount
        : campaignId && existingCampaign?.numberCreditsUsed != null
          ? existingCampaign.numberCreditsUsed
          : targetCount;
    if (typeof effectiveTargetCount === 'number' && effectiveTargetCount >= 1) {
      payload.targetCount = Math.min(MAX_PER_CAMPAIGN, effectiveTargetCount);
    }

    const effectiveCitySize = citySize || existingCampaign?.citySize || '1M+';

    if (campaignId && effectiveCitySize) {
      // Re-run on same campaign: draw a random city from the same population category
      const picked = await getRandomCityFromSupabase(effectiveCitySize);
      if (picked) {
        payload.cities = [picked.name];
        payload.country = picked.country;
        console.log('   - Re-run: random city from', effectiveCitySize, '->', picked.name, picked.country);
      } else {
        const citiesFromDb = await getCitiesFromSupabase(effectiveCitySize);
        payload.cities = citiesFromDb.map((c) => c.name);
        if (citiesFromDb.length === 0) {
          console.warn('No cities in Supabase for citySize:', effectiveCitySize, '- n8n may use fallback');
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
