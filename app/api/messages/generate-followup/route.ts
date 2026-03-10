import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server';
import { getGmailTokensForEmail } from '@/lib/supabase-gmail-accounts';
import { getValidGmailAccessToken } from '@/lib/gmail';
import { getGmailThreadWithBodies } from '@/lib/gmail-api';
import { generateFollowUpEmail } from '@/lib/leadgen/ai-draft';

/**
 * POST /api/messages/generate-followup
 * Body: { leadId: string }
 * Fetches the Gmail thread for this lead, extracts the original email + latest prospect reply,
 * and generates a contextual AI follow-up. Includes magic link (e.g. Calendly) only if prospect
 * seems interested.
 */
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { leadId } = body as { leadId?: string };
  if (!leadId) return NextResponse.json({ error: 'Missing leadId' }, { status: 400 });

  const admin = createAdminClient();
  const { data: lead, error: leadError } = await admin
    .from('leads')
    .select('id, email, campaign_id, user_id, gmail_thread_id, name, business_type, city')
    .eq('id', leadId)
    .eq('user_id', user.id)
    .single();

  if (leadError || !lead?.gmail_thread_id) {
    return NextResponse.json({ error: 'Lead not found or no Gmail thread' }, { status: 404 });
  }

  // Fetch campaign for AI context
  let companyDescription = '';
  let toneOfVoice = 'professional';
  let campaignGoal = 'book_call';
  let magicLink = '';
  let gmailEmail: string | null = null;

  if (lead.campaign_id) {
    const { data: campaign } = await admin
      .from('campaigns')
      .select('company_description, tone_of_voice, campaign_goal, magic_link, gmail_email')
      .eq('id', lead.campaign_id)
      .eq('user_id', user.id)
      .single();
    if (campaign) {
      companyDescription = campaign.company_description ?? '';
      toneOfVoice = campaign.tone_of_voice ?? 'professional';
      campaignGoal = campaign.campaign_goal ?? 'book_call';
      magicLink = campaign.magic_link ?? '';
      gmailEmail = campaign.gmail_email ?? null;
    }
  }

  // Get Gmail tokens
  const profile = await getGmailTokensForEmail(user.id, gmailEmail);
  if (!profile?.gmail_access_token || !profile.gmail_refresh_token) {
    return NextResponse.json({ error: 'Gmail not connected' }, { status: 400 });
  }

  let accessToken: string;
  try {
    accessToken = await getValidGmailAccessToken(
      profile.gmail_access_token,
      profile.gmail_refresh_token,
      profile.gmail_token_expiry,
      user.id,
      profile.gmail_email
    );
  } catch {
    return NextResponse.json({ error: 'Gmail token expired. Reconnect Gmail in Preferences.' }, { status: 400 });
  }

  const userEmail = (profile.gmail_email ?? '').trim().toLowerCase();
  const messages = await getGmailThreadWithBodies(accessToken, lead.gmail_thread_id, userEmail);

  const userMessages = (messages as { isFromUser: boolean; body?: string; snippet?: string }[]).filter((m) => m.isFromUser);
  const prospectMessages = (messages as { isFromUser: boolean; body?: string; snippet?: string }[]).filter((m) => !m.isFromUser);

  if (prospectMessages.length === 0) {
    return NextResponse.json({ error: 'No prospect reply found in thread' }, { status: 400 });
  }

  const originalEmail = userMessages[0]?.body || userMessages[0]?.snippet || '';
  const latestReply = prospectMessages[prospectMessages.length - 1];
  const prospectReply = latestReply?.body || latestReply?.snippet || '';

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'OpenAI not configured' }, { status: 500 });

  const result = await generateFollowUpEmail(apiKey, {
    companyDescription,
    toneOfVoice,
    campaignGoal,
    magicLink,
    originalEmail,
    prospectReply,
    businessName: (lead.name as string | null) ?? (lead.business_type as string | null) ?? '',
  });

  return NextResponse.json({ subject: result.subject, body: result.body });
}
