/**
 * Netlify Scheduled Function (v2): calls the app cron API every 15 minutes.
 * Requires env: CRON_SECRET, URL (set by Netlify at deploy time).
 */
const CRON_PATH = '/api/cron/launch-scheduled-campaigns';

export const config = {
  schedule: '*/15 * * * *',
};

export default async (): Promise<Response> => {
  const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
  const secret = process.env.CRON_SECRET;

  if (!baseUrl) {
    console.error('[cron-launch] Missing URL / DEPLOY_PRIME_URL');
    return new Response('Missing URL', { status: 500 });
  }
  if (!secret) {
    console.error('[cron-launch] Missing CRON_SECRET');
    return new Response('Missing CRON_SECRET', { status: 500 });
  }

  const url = baseUrl.replace(/\/$/, '') + CRON_PATH;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${secret}` },
    });
    const text = await res.text();
    if (!res.ok) {
      console.error('[cron-launch] API error', res.status, text);
      return new Response(text, { status: res.status });
    }
    console.log('[cron-launch] OK', res.status);
    return new Response(text, { status: 200 });
  } catch (err: unknown) {
    console.error('[cron-launch] Fetch error', err);
    return new Response(err instanceof Error ? err.message : 'Unknown error', { status: 500 });
  }
};
