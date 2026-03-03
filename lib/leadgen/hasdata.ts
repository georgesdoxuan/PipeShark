/**
 * HasData Google Maps Search API client.
 * Replaces n8n "Find Website" node.
 */

export interface HasDataLocalResult {
  website?: string;
  title?: string;
  url?: string;
  link?: string;
  [key: string]: unknown;
}

export interface HasDataSearchResponse {
  localResults?: HasDataLocalResult[];
  [key: string]: unknown;
}

const HASDATA_URL = 'https://api.hasdata.com/scrape/google-maps/search';

export async function searchGoogleMapsLocal(
  business: string,
  city: string,
  apiKey: string
): Promise<HasDataLocalResult[]> {
  const q = `${business} in ${city}`;
  const url = new URL(HASDATA_URL);
  url.searchParams.set('q', q);
  // n8n used POST with query param q and x-api-key header
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HasData API error ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as HasDataSearchResponse;
  let list = data.localResults ?? [];
  if (!Array.isArray(list) && list && typeof list === 'object') {
    list = [];
  }
  return Array.isArray(list) ? list : [];
}
