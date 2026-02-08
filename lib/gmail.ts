import { createAdminClient } from './supabase-server';

/**
 * Refresh Gmail OAuth access token using refresh token.
 * Updates the new token and expiry in user_profiles.
 */
export async function refreshGmailToken(refreshToken: string, userId: string): Promise<string> {
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
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('user_profiles')
    .update({
      gmail_access_token: data.access_token,
      gmail_token_expiry: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('Failed to update user_profiles with new token:', error);
    throw new Error('Failed to save refreshed token');
  }

  return data.access_token;
}

/**
 * Get valid Gmail access token for user. Refreshes if expired.
 */
export async function getValidGmailAccessToken(
  accessToken: string,
  refreshToken: string,
  tokenExpiry: string | null,
  userId: string
): Promise<string> {
  const expiry = tokenExpiry ? new Date(tokenExpiry) : new Date(0);
  const now = new Date();
  // Refresh 5 minutes before expiry
  const bufferMs = 5 * 60 * 1000;

  if (now.getTime() >= expiry.getTime() - bufferMs) {
    return refreshGmailToken(refreshToken, userId);
  }

  return accessToken;
}
