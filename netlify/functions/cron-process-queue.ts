/**
 * Netlify Scheduled Function: processes email queue every minute.
 * Calls GET /api/cron/process-email-queue (send or create draft for pending rows).
 * Requires env: CRON_SECRET, URL (set by Netlify).
 */
const CRON_PATH = '/api/cron/process-email-queue';

export const handler = async (): Promise<{ statusCode: number; body: string }> => {
  const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
  const secret = process.env.CRON_SECRET;

  if (!baseUrl) {
    console.error('[cron-process-queue] Missing URL');
    return { statusCode: 500, body: 'Missing URL' };
  }
  if (!secret) {
    console.error('[cron-process-queue] Missing CRON_SECRET');
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
      console.error('[cron-process-queue] API error', res.status, text);
      return { statusCode: res.status, body: text };
    }
    console.log('[cron-process-queue] OK', res.status, text.slice(0, 200));
    return { statusCode: 200, body: text };
  } catch (err: unknown) {
    console.error('[cron-process-queue] Fetch error', err);
    return {
      statusCode: 500,
      body: err instanceof Error ? err.message : 'Unknown error',
    };
  }
};
