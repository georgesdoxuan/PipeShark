import { createAdminClient } from './supabase-server';

/**
 * Update stored Gmail token after refresh. Primary account → user_profiles; secondary → user_gmail_accounts.
 */
async function updateGmailTokenInDb(
  userId: string,
  gmailEmail: string | null,
  accessToken: string,
  expiry: string
): Promise<void> {
  const admin = createAdminClient();
  const payload = {
    gmail_access_token: accessToken,
    gmail_token_expiry: expiry,
    updated_at: new Date().toISOString(),
  };

  if (!gmailEmail?.trim()) {
    const { error } = await admin.from('user_profiles').update(payload).eq('id', userId);
    if (error) throw new Error('Failed to save refreshed token');
    return;
  }

  const { data: profile } = await admin
    .from('user_profiles')
    .select('gmail_email')
    .eq('id', userId)
    .single();
  if (profile?.gmail_email?.toLowerCase() === gmailEmail.trim().toLowerCase()) {
    const { error } = await admin.from('user_profiles').update(payload).eq('id', userId);
    if (error) throw new Error('Failed to save refreshed token');
    return;
  }

  const { error } = await admin
    .from('user_gmail_accounts')
    .update(payload)
    .eq('user_id', userId)
    .eq('email', gmailEmail.trim());
  if (error) throw new Error('Failed to save refreshed token');
}

/**
 * Refresh Gmail OAuth access token using refresh token.
 * Updates the new token in user_profiles (primary) or user_gmail_accounts (secondary).
 * @param gmailEmail - If set, update that account (primary or secondary). Null = primary.
 */
export async function refreshGmailToken(
  refreshToken: string,
  userId: string,
  gmailEmail?: string | null
): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Gmail token refresh failed:', data);
    throw new Error(data.error_description || data.error || 'Failed to refresh Gmail token');
  }

  const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000);
  await updateGmailTokenInDb(userId, gmailEmail ?? null, data.access_token, expiresAt.toISOString());
  return data.access_token;
}

/**
 * Get valid Gmail access token for user. Refreshes if expired.
 * @param gmailEmail - For Pro: which account (updates correct row on refresh). Null = primary.
 */
export async function getValidGmailAccessToken(
  accessToken: string,
  refreshToken: string,
  tokenExpiry: string | null,
  userId: string,
  gmailEmail?: string | null
): Promise<string> {
  const expiry = tokenExpiry ? new Date(tokenExpiry) : new Date(0);
  const now = new Date();
  const bufferMs = 5 * 60 * 1000;

  if (now.getTime() >= expiry.getTime() - bufferMs) {
    return refreshGmailToken(refreshToken, userId, gmailEmail);
  }

  return accessToken;
}
