import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getLeadsForUser, markLeadReplied } from '@/lib/supabase-leads';
import { getValidGmailAccessToken } from '@/lib/gmail';
import { getGmailThread, threadHasReplyFromRecipient } from '@/lib/gmail-api';

/**
 * POST /api/gmail/check-replies
 * Sync replies: for each lead with a Gmail thread ID and not yet replied,
 * check the thread via Gmail API and mark as replied if the prospect answered.
 */
export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select(
        'gmail_access_token, gmail_refresh_token, gmail_token_expiry, gmail_email, gmail_connected'
      )
      .eq('id', user.id)
      .single();

    if (
      !profile?.gmail_connected ||
      !profile.gmail_access_token ||
      !profile.gmail_refresh_token
    ) {
      return NextResponse.json(
        { error: 'Gmail not connected', hint: 'Connect Gmail in dashboard' },
        { status: 400 }
      );
    }

    let accessToken = profile.gmail_access_token;
    try {
      accessToken = await getValidGmailAccessToken(
        profile.gmail_access_token,
        profile.gmail_refresh_token,
        profile.gmail_token_expiry,
        user.id
      );
    } catch (err) {
      console.error('Gmail token refresh failed:', err);
      return NextResponse.json(
        { error: 'Failed to refresh Gmail token. Reconnect Gmail.' },
        { status: 400 }
      );
    }

    const userEmail = (profile.gmail_email || '').trim().toLowerCase();
    if (!userEmail) {
      return NextResponse.json(
        { error: 'Gmail email not found for user' },
        { status: 400 }
      );
    }

    const leads = await getLeadsForUser(user.id);
    const pending = leads.filter(
      (l: any) =>
        !l.replied &&
        l.gmailThreadId &&
        String(l.gmailThreadId).trim() !== ''
    );

    let updated = 0;
    const errors: string[] = [];

    for (const lead of pending) {
      const threadId = (lead as any).gmailThreadId as string;
      try {
        const thread = await getGmailThread(accessToken, threadId);
        if (!thread) {
          continue;
        }
        if (threadHasReplyFromRecipient(thread, userEmail)) {
          const ok = await markLeadReplied(lead.id, user.id);
          if (ok) updated++;
        }
      } catch (e: any) {
        errors.push(`Lead ${lead.id}: ${e.message || 'Error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      checked: pending.length,
      updated,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Check-replies error:', error);
    return NextResponse.json(
      { error: 'Check failed', details: error.message },
      { status: 500 }
    );
  }
}
