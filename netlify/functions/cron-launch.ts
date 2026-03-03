/**
 * Netlify Scheduled Function: calls the app cron API every 15 minutes.
 * Schedule: every 15 min (configured in netlify.toml).
 * Requires env: CRON_SECRET, URL (set by Netlify at deploy time).
 */
const CRON_PATH = '/api/cron/launch-scheduled-campaigns';

export const handler = async (): Promise<{ statusCode: number; body: string }> => {
  const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
  const secret = process.env.CRON_SECRET;

  if (!baseUrl) {
    console.error('[cron-launch] Missing URL / DEPLOY_PRIME_URL');
    return { statusCode: 500, body: 'Missing URL' };
  }
  if (!secret) {
    console.error('[cron-launch] Missing CRON_SECRET');
    return { statusCode: 500, body: 'Missing CRON_SECRET' };
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
      return { statusCode: res.status, body: text };
    }
    console.log('[cron-launch] OK', res.status);
    return { statusCode: 200, body: text };
  } catch (err: unknown) {
    console.error('[cron-launch] Fetch error', err);
    return { statusCode: 500, body: err instanceof Error ? err.message : 'Unknown error' };
  }
};
