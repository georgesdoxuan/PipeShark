import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getLeadsForUser, markLeadReplied, markLeadEmailSent, setLeadEmailSent } from '@/lib/supabase-leads';
import { getValidGmailAccessToken } from '@/lib/gmail';
import { getGmailThread, threadHasReplyFromRecipient, threadHasMessageFromUser, getGmailUserEmail } from '@/lib/gmail-api';

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
      console.error('[check-replies] 400: Gmail not connected or missing tokens', {
        hasProfile: !!profile,
        gmail_connected: profile?.gmail_connected,
        hasAccessToken: !!profile?.gmail_access_token,
        hasRefreshToken: !!profile?.gmail_refresh_token,
      });
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

    let userEmail = (profile.gmail_email || '').trim().toLowerCase();
    if (!userEmail) {
      const fromApi = await getGmailUserEmail(accessToken);
      if (fromApi) {
        userEmail = fromApi;
        await supabase
          .from('user_profiles')
          .update({ gmail_email: userEmail, updated_at: new Date().toISOString() })
          .eq('id', user.id);
      }
    }
    if (!userEmail) {
      console.error('[check-replies] 400: Gmail email not found for user', user.id);
      return NextResponse.json(
        { error: 'Gmail email not found for user' },
        { status: 400 }
      );
    }

    const leads = await getLeadsForUser(user.id);
    const withThreadId = leads.filter(
      (l: any) => l.gmailThreadId && String(l.gmailThreadId).trim() !== ''
    );
    const pendingReplies = withThreadId.filter((l: any) => !l.replied);

    let updatedReplies = 0;
    let updatedSent = 0;
    const errors: string[] = [];

    // 1) Leads with Gmail thread: check thread for sent + reply
    for (const lead of withThreadId) {
      const threadId = (lead as any).gmailThreadId as string;
      try {
        const thread = await getGmailThread(accessToken, threadId);
        if (!thread) {
          continue;
        }
        const hasSentInThread = threadHasMessageFromUser(thread, userEmail);
        if ((lead as any).emailSent && !hasSentInThread) {
          await setLeadEmailSent(lead.id, user.id, false);
        } else if (!(lead as any).emailSent && hasSentInThread) {
          const ok = await markLeadEmailSent(lead.id, user.id);
          if (ok) updatedSent++;
        }
        if (!lead.replied && threadHasReplyFromRecipient(thread, userEmail)) {
          const ok = await markLeadReplied(lead.id, user.id);
          if (ok) updatedReplies++;
        }
      } catch (e: any) {
        errors.push(`Lead ${lead.id}: ${e.message || 'Error'}`);
      }
    }

    // 2) "Sent" is only set from thread check above (lead has gmail_thread_id and we see user's message in that thread).
    // We do NOT search in:sent by address, to avoid marking drafts/automated sends as "sent" when the user only sent one manually.

    return NextResponse.json({
      success: true,
      checked: pendingReplies.length,
      updated: updatedReplies,
      updatedSent,
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
