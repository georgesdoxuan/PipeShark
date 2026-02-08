import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const errorParam = searchParams.get('error');

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const basePath = baseUrl.replace(/\/$/, '');

  const returnUrl = `${basePath}/dashboard`;

  if (errorParam) {
    console.error('Google OAuth error:', errorParam, searchParams.get('error_description'));
    return NextResponse.redirect(`${returnUrl}?gmail_error=${encodeURIComponent(errorParam)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${returnUrl}?gmail_error=missing_params`);
  }

  try {
    let statePayload: { userId: string; nonce: string; returnTo?: string };
    try {
      statePayload = JSON.parse(Buffer.from(state, 'base64url').toString());
    } catch {
      return NextResponse.redirect(`${basePath}/dashboard?gmail_error=invalid_state`);
    }

    const returnPath = statePayload.returnTo || '/dashboard';
    const finalReturnUrl = `${basePath}${returnPath.startsWith('/') ? returnPath : '/' + returnPath}`;

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.id !== statePayload.userId) {
      return NextResponse.redirect(`${finalReturnUrl}?gmail_error=unauthorized`);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.NEXT_PUBLIC_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.redirect(`${finalReturnUrl}?gmail_error=config`);
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
      return NextResponse.redirect(`${finalReturnUrl}?gmail_error=token_exchange`);
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

    // user_profiles has an "email" column (NOT NULL) - use auth user email or Gmail
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
      return NextResponse.redirect(`${finalReturnUrl}?gmail_error=save_failed`);
    }

    return NextResponse.redirect(`${finalReturnUrl}?gmail_connected=1`);
  } catch (err) {
    console.error('Gmail callback error:', err);
    const basePath = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
    return NextResponse.redirect(`${basePath}/dashboard?gmail_error=unknown`);
  }
}
