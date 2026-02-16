import { createAdminClient } from './supabase-server';
import { getUserPlanInfo } from './supabase-user-plan';

export const MAX_GMAIL_ACCOUNTS_PRO = 3;

export interface GmailAccountInfo {
  email: string;
  source: 'primary' | 'secondary';
  connected: boolean;
}

/**
 * List all Gmail accounts for a user: primary (user_profiles) + secondary (user_gmail_accounts).
 * For Standard/trial: only primary. For Pro: up to 3 total.
 */
export async function listGmailAccountsForUser(userId: string): Promise<GmailAccountInfo[]> {
  const admin = createAdminClient();
  const accounts: GmailAccountInfo[] = [];

  const { data: profile } = await admin
    .from('user_profiles')
    .select('gmail_email, gmail_connected')
    .eq('id', userId)
    .single();

  if (profile?.gmail_email) {
    accounts.push({
      email: profile.gmail_email,
      source: 'primary',
      connected: !!profile.gmail_connected,
    });
  }

  const { data: secondary } = await admin
    .from('user_gmail_accounts')
    .select('email, gmail_connected')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  for (const row of secondary || []) {
    accounts.push({
      email: row.email,
      source: 'secondary',
      connected: !!row.gmail_connected,
    });
  }

  return accounts;
}

/**
 * Get Gmail tokens for a given email. Checks primary (user_profiles) then user_gmail_accounts.
 */
export async function getGmailTokensForEmail(
  userId: string,
  email: string | null
): Promise<{
  gmail_access_token: string | null;
  gmail_refresh_token: string | null;
  gmail_token_expiry: string | null;
  gmail_email: string | null;
} | null> {
  if (!email?.trim()) {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('user_profiles')
      .select('gmail_access_token, gmail_refresh_token, gmail_token_expiry, gmail_email')
      .eq('id', userId)
      .single();
    return profile
      ? {
          gmail_access_token: profile.gmail_access_token ?? null,
          gmail_refresh_token: profile.gmail_refresh_token ?? null,
          gmail_token_expiry: profile.gmail_token_expiry ?? null,
          gmail_email: profile.gmail_email ?? null,
        }
      : null;
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('user_profiles')
    .select('gmail_access_token, gmail_refresh_token, gmail_token_expiry, gmail_email')
    .eq('id', userId)
    .single();

  if (profile?.gmail_email?.toLowerCase() === email.trim().toLowerCase()) {
    return {
      gmail_access_token: profile.gmail_access_token ?? null,
      gmail_refresh_token: profile.gmail_refresh_token ?? null,
      gmail_token_expiry: profile.gmail_token_expiry ?? null,
      gmail_email: profile.gmail_email ?? null,
    };
  }

  const { data: secondary } = await admin
    .from('user_gmail_accounts')
    .select('gmail_access_token, gmail_refresh_token, gmail_token_expiry, email')
    .eq('user_id', userId)
    .eq('email', email.trim())
    .single();

  if (secondary) {
    return {
      gmail_access_token: secondary.gmail_access_token ?? null,
      gmail_refresh_token: secondary.gmail_refresh_token ?? null,
      gmail_token_expiry: secondary.gmail_token_expiry ?? null,
      gmail_email: secondary.email ?? null,
    };
  }

  return null;
}

/**
 * Whether the user can add another Gmail account (Pro only, max 3).
 */
export async function canAddGmailAccount(userId: string): Promise<boolean> {
  const planInfo = await getUserPlanInfo(userId);
  if (planInfo.plan !== 'pro') return false;
  const accounts = await listGmailAccountsForUser(userId);
  return accounts.length < MAX_GMAIL_ACCOUNTS_PRO;
}

/**
 * Count of connected Gmail accounts (for Pro limit).
 */
export async function countGmailAccounts(userId: string): Promise<number> {
  const accounts = await listGmailAccountsForUser(userId);
  return accounts.length;
}
