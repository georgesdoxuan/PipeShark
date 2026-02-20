/**
 * Map country name (as stored in leads) to a default IANA timezone for business-hours scheduling.
 * One timezone per country; for countries with multiple TZ we use the most common one.
 */
const COUNTRY_TO_TZ: Record<string, string> = {
  france: 'Europe/Paris',
  germany: 'Europe/Berlin',
  'united kingdom': 'Europe/London',
  uk: 'Europe/London',
  spain: 'Europe/Madrid',
  italy: 'Europe/Rome',
  netherlands: 'Europe/Amsterdam',
  belgium: 'Europe/Brussels',
  switzerland: 'Europe/Zurich',
  austria: 'Europe/Vienna',
  portugal: 'Europe/Lisbon',
  poland: 'Europe/Warsaw',
  sweden: 'Europe/Stockholm',
  norway: 'Europe/Oslo',
  denmark: 'Europe/Copenhagen',
  ireland: 'Europe/Dublin',
  'united states': 'America/New_York',
  'usa': 'America/New_York',
  'u.s.': 'America/New_York',
  'us': 'America/New_York',
  canada: 'America/Toronto',
  australia: 'Australia/Sydney',
  'new zealand': 'Pacific/Auckland',
  japan: 'Asia/Tokyo',
  china: 'Asia/Shanghai',
  india: 'Asia/Kolkata',
  singapore: 'Asia/Singapore',
  'south korea': 'Asia/Seoul',
  korea: 'Asia/Seoul',
  brazil: 'America/Sao_Paulo',
  mexico: 'America/Mexico_City',
  argentina: 'America/Argentina/Buenos_Aires',
  chile: 'America/Santiago',
  colombia: 'America/Bogota',
  'south africa': 'Africa/Johannesburg',
  nigeria: 'Africa/Lagos',
  egypt: 'Africa/Cairo',
  kenya: 'Africa/Nairobi',
  israel: 'Asia/Jerusalem',
  uae: 'Asia/Dubai',
  'united arab emirates': 'Asia/Dubai',
  'saudi arabia': 'Asia/Riyadh',
  turkey: 'Europe/Istanbul',
  russia: 'Europe/Moscow',
  ukraine: 'Europe/Kyiv',
  greece: 'Europe/Athens',
  'czech republic': 'Europe/Prague',
  romania: 'Europe/Bucharest',
  hungary: 'Europe/Budapest',
};

function normalize(s: string | null | undefined): string {
  if (!s || typeof s !== 'string') return '';
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Return IANA timezone for a lead based on country (and optionally city).
 * Falls back to UTC if unknown.
 */
export function getTimezoneForLead(country: string | null | undefined, _city?: string | null): string {
  const c = normalize(country);
  if (!c) return 'UTC';
  const tz = COUNTRY_TO_TZ[c];
  if (tz) return tz;
  // Try without accents / common variants
  const key = Object.keys(COUNTRY_TO_TZ).find((k) => c.includes(k) || k.includes(c));
  return key ? COUNTRY_TO_TZ[key] : 'UTC';
}
