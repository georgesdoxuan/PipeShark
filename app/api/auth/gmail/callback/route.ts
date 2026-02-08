import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-server';

const CALLBACK_TIMEOUT_MS = 15000;

function redirect(url: string, status = 302) {
  return NextResponse.redirect(url, { status, headers: { 'Cache-Control': 'no-store' } });
}

/** Must match the redirect_uri used in the auth request (Google requires it). */
function getRedirectUri(request: Request): string {
  try {
    const url = new URL(request.url);
    return `${url.origin}/api/auth/gmail/callback`;
  } catch {
    return process.env.NEXT_PUBLIC_REDIRECT_URI || '';
  }
}

export async function GET(request: Request) {
  // Debug: confirm callback is hit (check terminal after clicking Allow)
  console.log('[Gmail callback] GET', new URL(request.url).pathname);

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const errorParam = searchParams.get('error');

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const basePath = baseUrl.replace(/\/$/, '');
  const returnUrl = `${basePath}/dashboard`;

  if (errorParam) {
    console.error('Google OAuth error:', errorParam, searchParams.get('error_description'));
    return redirect(`${returnUrl}?gmail_error=${encodeURIComponent(errorParam)}`);
  }

  if (!code || !state) {
    return redirect(`${returnUrl}?gmail_error=missing_params`);
  }

  const run = async () => {
    let statePayload: { userId: string; nonce: string; returnTo?: string };
    try {
      statePayload = JSON.parse(Buffer.from(state, 'base64url').toString());
    } catch {
      return redirect(`${basePath}/dashboard?gmail_error=invalid_state`);
    }

    const returnPath = statePayload.returnTo || '/dashboard';
    const finalReturnUrl = `${basePath}${returnPath.startsWith('/') ? returnPath : '/' + returnPath}`;

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.id !== statePayload.userId) {
      return redirect(`${finalReturnUrl}?gmail_error=unauthorized`);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = getRedirectUri(request);

    if (!clientId || !clientSecret || !redirectUri) {
      return redirect(`${finalReturnUrl}?gmail_error=config`);
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokenData);
      return redirect(`${finalReturnUrl}?gmail_error=token_exchange`);
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in || 3600;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    const userInfoResponse = await fetch(
      `https://www.googleapis.com/oauth2/v1/userinfo?access_token=${accessToken}`
    );
    const userInfo = await userInfoResponse.json();
    const gmailEmail = userInfo.email || userInfo.id || '';

    const profileEmail = user.email || gmailEmail || `${user.id}@pipeshark.local`;

    const admin = createAdminClient();
    const { error } = await admin
      .from('user_profiles')
      .upsert(
        {
          id: user.id,
          email: profileEmail,
          gmail_access_token: accessToken,
          gmail_refresh_token: refreshToken || null,
          gmail_token_expiry: expiresAt.toISOString(),
          gmail_email: gmailEmail,
          gmail_connected: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

    if (error) {
      console.error('Failed to save Gmail tokens:', error);
      return redirect(`${finalReturnUrl}?gmail_error=save_failed`);
    }

    return redirect(`${finalReturnUrl}?gmail_connected=1`);
  };

  try {
    const timeoutPromise = new Promise<NextResponse>((_, reject) =>
      setTimeout(() => reject(new Error('callback_timeout')), CALLBACK_TIMEOUT_MS)
    );
    const result = await Promise.race([run(), timeoutPromise]);
    return result;
  } catch (err) {
    const basePath = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
    if (err instanceof Error && err.message === 'callback_timeout') {
      console.error('Gmail callback timeout');
      return redirect(`${basePath}/dashboard?gmail_error=timeout`);
    }
    console.error('Gmail callback error:', err);
    return redirect(`${basePath}/dashboard?gmail_error=unknown`);
  }
}
