/**
 * Netlify Scheduled Function (v2): GDPR purge — strips PII from non-replied leads older than 30 days.
 * Runs once daily at 03:00 UTC.
 */
const CRON_PATH = '/api/cron/purge-old-leads';

export const config = {
  schedule: '0 3 * * *',
};

export default async (): Promise<Response> => {
  const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
  const secret = process.env.CRON_SECRET;

  if (!baseUrl) {
    console.error('[cron-purge-leads] Missing URL / DEPLOY_PRIME_URL');
    return new Response('Missing URL', { status: 500 });
  }
  if (!secret) {
    console.error('[cron-purge-leads] Missing CRON_SECRET');
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
      console.error('[cron-purge-leads] API error', res.status, text);
      return new Response(text, { status: res.status });
    }
    console.log('[cron-purge-leads] OK', res.status, text);
    return new Response(text, { status: 200 });
  } catch (err: unknown) {
    console.error('[cron-purge-leads] Fetch error', err);
    return new Response(err instanceof Error ? err.message : 'Unknown error', { status: 500 });
  }
};
