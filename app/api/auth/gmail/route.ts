import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { randomBytes } from 'crypto';

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.modify',
].join(' ');

/** Build redirect URI from request so it always matches the port/host the user actually uses. */
function getRedirectUri(request: Request): string {
  try {
    const url = new URL(request.url);
    return `${url.origin}/api/auth/gmail/callback`;
  } catch {
    return process.env.NEXT_PUBLIC_REDIRECT_URI || '';
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = getRedirectUri(request);

    if (!clientId || !redirectUri) {
      console.error('GOOGLE_CLIENT_ID or redirect URI not configured');
      return NextResponse.json(
        { error: 'OAuth not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const returnTo = searchParams.get('return_to') || '/dashboard';
    const addSecondary = searchParams.get('add_secondary') === '1';

    const nonce = randomBytes(16).toString('hex');
    const statePayload = JSON.stringify({ userId: user.id, nonce, returnTo, addSecondary: addSecondary || undefined });
    const state = Buffer.from(statePayload).toString('base64url');

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', GMAIL_SCOPES);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', state);

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('Gmail OAuth init error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Gmail connection' },
      { status: 500 }
    );
  }
}
