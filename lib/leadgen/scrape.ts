/**
 * Scrape and extract contact data from website HTML.
 * Replaces n8n nodes: Extract Web HTML, Extract Email (from HTML), Clean HTML Text, Phone & LK, Filter.
 */

const DEFAULT_FETCH_TIMEOUT_MS = 20000;

export interface ScrapedLead {
  website: string;
  title?: string;
  email: string;
  url: string;
  html: string;
  cleanText: string;
  phone: string;
  linkedin: string;
}

const INVALID_EMAILS = new Set([
  'no email found',
  'user@domain.com',
  'example@example.com',
  'example@mysite.com',
  'email@example.com',
  'name@example.com',
  'info@example.com',
  'test@test.com',
  'user@example.com',
]);

const PLACEHOLDER_DOMAINS = new Set([
  'example.com', 'mysite.com', 'yoursite.com', 'yourdomain.com',
  'domain.com', 'yourwebsite.com', 'website.com', 'test.com',
  'placeholder.com', 'sample.com', 'demo.com',
]);

const PLACEHOLDER_LOCAL_PARTS = new Set([
  'example', 'test', 'demo', 'sample', 'placeholder', 'your', 'noreply',
  'no-reply', 'donotreply', 'do-not-reply', 'webmaster',
]);

function isInvalidEmail(email: string): boolean {
  const lower = email.toLowerCase().trim();
  if (INVALID_EMAILS.has(lower)) return true;
  if (lower.includes('shutterstock')) return true;
  if (lower.includes('2x.webp')) return true;
  if (lower.length >= 50) return true;
  if (/^[a-f0-9]{20,}@/.test(lower)) return true;
  if (lower.endsWith('.js') || lower.includes('module.') || lower.includes('.svg') || lower.includes('.png') || lower.includes('.jpg') || lower.includes('.webp') || lower.includes('.gif') || lower.includes('.jpeg') || lower.includes('.ico') || lower.includes('.css') || lower.includes('.php')) return true;
  // Reject emails where the TLD is a media/file extension
  const tldMatch = lower.match(/\.([a-z]{2,6})$/);
  if (tldMatch) {
    const tld = tldMatch[1];
    if (['webp','png','jpg','jpeg','gif','svg','ico','pdf','zip','mp4','mp3','css','js','ts','tsx','jsx','woff','ttf'].includes(tld)) return true;
  }
  if (lower.includes('sentry.io') || lower.includes('ingest.') || lower.includes('analytics') || lower.includes('tracking') || lower.includes('@o')) return true;
  const [local, domain] = lower.split('@');
  if (domain && PLACEHOLDER_DOMAINS.has(domain)) return true;
  if (local && PLACEHOLDER_LOCAL_PARTS.has(local)) return true;
  return false;
}

export function extractEmailFromHtml(html: string): string {
  if (!html || typeof html !== 'string') return 'No email found';
  // Decode URL-encoded chars before extracting (e.g. %20info@ → info@)
  let decoded = html;
  try { decoded = decodeURIComponent(html.replace(/\+/g, ' ')); } catch { decoded = html; }
  const matches = decoded.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi);
  if (!matches) return 'No email found';
  // Strip any leading/trailing non-alphanumeric chars left from encoding artifacts
  const cleaned = matches.map((e) => e.replace(/^[^a-zA-Z0-9]+/, '').replace(/[^a-zA-Z0-9]+$/, ''));
  const filtered = cleaned.filter((e) => !isInvalidEmail(e));
  return filtered.length > 0 ? filtered[0].toLowerCase() : 'No email found';
}

export function cleanHtmlToText(html: string, maxLength: number = 2000): string {
  if (!html || html.length < 100) return 'No valid website content available';
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, maxLength);
  return text;
}

const PHONE_PATTERNS = [
  /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
  /\+\?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g,
];

function formatPhone(cleaned: string, cityHint: string): string {
  const city = (cityHint || '').toLowerCase();
  if (!cleaned.startsWith('+')) {
    if (
      city.includes('new york') || city.includes('los angeles') || city.includes('chicago') ||
      city.includes('houston') || city.includes('toronto') || city.includes('montreal') ||
      cleaned.length === 10
    ) {
      cleaned = '+1' + cleaned;
    } else if (city.includes('london') || city.includes('manchester') || city.includes('birmingham')) {
      cleaned = '+44' + cleaned;
    } else if (city.includes('sydney') || city.includes('melbourne') || city.includes('brisbane')) {
      cleaned = '+61' + cleaned;
    } else if (city.includes('dublin')) {
      cleaned = '+353' + cleaned;
    } else if (city.includes('auckland')) {
      cleaned = '+64' + cleaned;
    } else if (cleaned.length === 10) {
      cleaned = '+1' + cleaned;
    }
  }
  if (cleaned.startsWith('+1') && cleaned.length === 12) {
    return `+1 (${cleaned.slice(2, 5)}) ${cleaned.slice(5, 8)}-${cleaned.slice(8)}`;
  }
  if (cleaned.startsWith('+44')) {
    return `+44 ${cleaned.slice(3, 5)} ${cleaned.slice(5, 9)} ${cleaned.slice(9)}`;
  }
  if (cleaned.startsWith('+61')) {
    return `+61 ${cleaned.slice(3, 4)} ${cleaned.slice(4, 8)} ${cleaned.slice(8)}`;
  }
  return cleaned;
}

export function extractPhoneAndLinkedIn(html: string, cityHint: string): { phone: string; linkedin: string } {
  let phone = 'No phone found';
  for (const pattern of PHONE_PATTERNS) {
    const match = html.match(pattern);
    if (match && match[0].length >= 10) {
      const cleaned = match[0].replace(/[^\d+]/g, '');
      if (cleaned.length >= 10) {
        // Filter placeholder/fake numbers: all same digit, or sequential like 1234567890
        const digitsOnly = cleaned.replace(/\D/g, '');
        const isAllSameDigit = /^(\d)\1{6,}$/.test(digitsOnly);
        const isSequential = ['1234567890','0987654321','1234567','9999999999','0000000000','1111111111','2222222222','3333333333','5555555555','6666666666','7777777777','8888888888'].some(p => digitsOnly.includes(p));
        if (isAllSameDigit || isSequential) continue;
        phone = formatPhone(cleaned, cityHint);
        break;
      }
    }
  }

  let linkedin = 'No LinkedIn found';
  const linkedinMatch = html.match(/https?:\/\/(?:www\.)?linkedin\.com\/[a-zA-Z0-9\-_\/\\]+/g);
  if (linkedinMatch && linkedinMatch.length > 0) {
    linkedin = linkedinMatch[0].replace(/\\\//g, '/');
  }

  return { phone, linkedin };
}

export async function fetchPageHtml(url: string, timeoutMs: number = DEFAULT_FETCH_TIMEOUT_MS): Promise<string> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PipeShark/1.0)' },
    });
    if (!res.ok) return '';
    return await res.text();
  } catch {
    return '';
  } finally {
    clearTimeout(t);
  }
}

export function filterValidEmail(lead: ScrapedLead): boolean {
  const e = (lead.email || '').toLowerCase().trim();
  if (!e || e === 'no email found') return false;
  return !isInvalidEmail(e);
}

/** Free/personal email domains to filter out during campaigns. */
const PERSONAL_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com',
  'yahoo.com', 'yahoo.fr', 'yahoo.co.uk', 'yahoo.ca', 'yahoo.com.au', 'yahoo.it', 'yahoo.es', 'yahoo.de',
  'hotmail.com', 'hotmail.fr', 'hotmail.co.uk', 'hotmail.it', 'hotmail.es', 'hotmail.de',
  'outlook.com', 'outlook.fr', 'outlook.co.uk', 'outlook.de', 'outlook.it',
  'live.com', 'live.fr', 'live.co.uk', 'live.it', 'live.de', 'live.nl',
  'msn.com',
  'aol.com', 'aol.fr',
  'icloud.com', 'me.com', 'mac.com',
  'proton.me', 'protonmail.com', 'protonmail.ch',
  'gmx.com', 'gmx.de', 'gmx.fr', 'gmx.at', 'gmx.ch',
  'web.de',
  'laposte.net', 'orange.fr', 'sfr.fr', 'free.fr', 'wanadoo.fr', 'bbox.fr', 'club-internet.fr', 'neuf.fr',
  'btinternet.com', 'sky.com', 'talktalk.net', 'virginmedia.com', 'ntlworld.com',
  'libero.it', 'tiscali.it', 'alice.it', 'virgilio.it',
  't-online.de', 'freenet.de',
  'mail.com', 'mail.ru', 'yandex.ru', 'yandex.com',
  'telenet.be', 'skynet.be',
  'shaw.ca', 'rogers.com', 'bell.net', 'videotron.ca',
]);

export function isPersonalEmailDomain(email: string): boolean {
  const at = email.indexOf('@');
  if (at === -1) return false;
  const domain = email.slice(at + 1).toLowerCase();
  return PERSONAL_EMAIL_DOMAINS.has(domain);
}

export function filterProfessionalEmail(lead: ScrapedLead): boolean {
  const e = (lead.email || '').toLowerCase().trim();
  if (!e || e === 'no email found') return false;
  return !isPersonalEmailDomain(e);
}
