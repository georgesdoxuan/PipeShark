/**
 * Leadgen pipeline: HasData search → scrape → filter → limit → AI summarize + draft → Gmail draft → Supabase.
 * Replaces the full "Pipeshark Workflow" n8n workflow.
 */

import { createAdminClient } from '@/lib/supabase-server';
import { searchGoogleMapsLocal } from './hasdata';
import { jitterCityCoords } from '@/lib/city-coords';
import {
  fetchPageHtml,
  extractEmailFromHtml,
  cleanHtmlToText,
  extractPhoneAndLinkedIn,
  filterValidEmail,
  filterProfessionalEmail,
  type ScrapedLead,
} from './scrape';
import { summarizeWebsite, generateDraftEmail, generateCallPrep, type DraftEmailInput } from './ai-draft';
import { createGmailDraft } from '@/lib/gmail-api';

export interface LeadgenPayload {
  userId: string;
  campaignId?: string;
  businessType: string;
  targetCount?: number;
  cities?: string[];
  city?: string;
  citySize?: string;
  country?: string;
  companyDescription?: string;
  toneOfVoice?: string;
  campaignGoal?: string;
  magicLink?: string;
  exampleEmail?: string;
  businessLinkText?: string;
  /** Max words for the email body. Default 150. */
  emailMaxLength?: number;
  /** Filter personal/free email domains (gmail, hotmail, etc.). Default true. */
  filterPersonalEmails?: boolean;
  /** Custom AI writing instructions injected into the draft prompt. */
  aiInstructions?: string;
  /** 'local_businesses' (HasData) or other modes. Default local_businesses. */
  mode?: string;
  gmailAccessToken: string;
  gmailRefreshToken?: string;
  gmailEmail?: string;
}

export interface LeadgenResult {
  success: boolean;
  leadsCreated: number;
  errors: string[];
}

function pickCity(payload: LeadgenPayload): string {
  if (typeof payload.city === 'string' && payload.city.trim()) return payload.city.trim();
  const cities = Array.isArray(payload.cities) ? payload.cities : [];
  if (cities.length === 1) return cities[0];
  if (cities.length > 1) return cities[Math.floor(Math.random() * cities.length)] ?? 'New York';
  return 'New York';
}

function getWebsiteUrl(item: { website?: string; url?: string; link?: string }): string {
  const u = item.website ?? item.url ?? item.link ?? '';
  return typeof u === 'string' ? u.trim() : '';
}

function getTitle(item: { title?: string; name?: string }): string {
  const t = item.title ?? item.name ?? '';
  return typeof t === 'string' ? t.trim() : '';
}

export async function runLeadgenPipeline(payload: LeadgenPayload): Promise<LeadgenResult> {
  const errors: string[] = [];
  let leadsCreated = 0;
  const apiKey = process.env.HASDATA_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { success: false, leadsCreated: 0, errors: ['HASDATA_API_KEY is not set'] };
  }
  if (!openaiKey) {
    return { success: false, leadsCreated: 0, errors: ['OPENAI_API_KEY is not set'] };
  }

  const city = pickCity(payload);
  const targetCount = Math.min(20, Math.max(1, Math.round(payload.targetCount ?? 10)));
  const business = (payload.businessType || 'plumber').trim();

  const coords = jitterCityCoords(city) ?? undefined;

  let localResults: Array<{ website?: string; url?: string; link?: string; title?: string; name?: string; [k: string]: unknown }>;
  try {
    localResults = await searchGoogleMapsLocal(business, city, apiKey, coords);
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
    return { success: false, leadsCreated: 0, errors };
  }

  const scraped: Array<ScrapedLead & { hasdataExtra: string }> = [];
  for (const item of localResults) {
    const website = getWebsiteUrl(item);
    if (!website || !website.startsWith('http')) continue;
    const html = await fetchPageHtml(website);
    const email = extractEmailFromHtml(html);
    const cleanText = cleanHtmlToText(html);
    const { phone, linkedin } = extractPhoneAndLinkedIn(html, city);
    // Carry HasData fields (rating, reviews, description, serviceOptions) for AI context
    const r = item as Record<string, unknown>;
    const hasdataExtra = [
      r.rating != null ? `Rating: ${r.rating}` : '',
      r.reviewsCount != null ? `Reviews: ${r.reviewsCount}` : '',
      r.description ? `Description: ${r.description}` : '',
      r.serviceOptions ? `Services: ${r.serviceOptions}` : '',
      r.price ? `Price: ${r.price}` : '',
    ].filter(Boolean).join('\n');
    scraped.push({
      website,
      title: getTitle(item),
      email,
      url: website,
      html,
      cleanText,
      phone,
      linkedin,
      hasdataExtra,
    });
  }

  const validEmails = scraped.filter(filterValidEmail);
  // Filter personal email domains when requested (default: true)
  const filterPersonal = payload.filterPersonalEmails !== false;
  const filtered = filterPersonal ? validEmails.filter(filterProfessionalEmail) : validEmails;
  // If personal filter removed too many, fall back to valid emails to try to meet targetCount
  const candidates = filtered.length >= Math.ceil(targetCount * 0.5) ? filtered : validEmails;
  // Take up to 3x targetCount so deduplication doesn't leave us short
  const pool = candidates.slice(0, targetCount * 3);
  const admin = createAdminClient();

  // Deduplicate against all emails in the pool
  const poolEmails = pool.map((l) => l.email.toLowerCase().trim()).filter(Boolean);
  const existingEmailsSet = new Set<string>();
  if (poolEmails.length > 0) {
    const { data: existingLeads } = await admin
      .from('leads')
      .select('email')
      .eq('user_id', payload.userId)
      .in('email', poolEmails);
    for (const r of existingLeads ?? []) {
      if (r.email) existingEmailsSet.add((r.email as string).toLowerCase().trim());
    }
  }
  const deduped = pool.filter((l) => !existingEmailsSet.has(l.email.toLowerCase().trim()));

  for (const lead of deduped) {
    // Stop once we've created the requested number of leads
    if (leadsCreated >= targetCount) break;
    try {
      const [websiteSummary, callPrep] = await Promise.all([
        summarizeWebsite(openaiKey, lead.cleanText, lead.hasdataExtra),
        generateCallPrep(openaiKey, lead.cleanText, lead.title ?? business, business, city, lead.url),
      ]);

      const draftInput: DraftEmailInput = {
        companyDescription: payload.companyDescription ?? '',
        toneOfVoice: payload.toneOfVoice ?? 'professional',
        campaignGoal: payload.campaignGoal ?? 'book_call',
        magicLink: payload.magicLink ?? '',
        exampleEmail: payload.exampleEmail ?? '',
        businessLinkText: payload.businessLinkText ?? '',
        emailMaxLength: payload.emailMaxLength ?? 150,
        aiInstructions: payload.aiInstructions ?? '',
        business,
        businessName: lead.title || business,
        city,
        websiteUrl: lead.url,
        websiteSummary,
        hasdataExtra: lead.hasdataExtra,
      };
      const { subject, body } = await generateDraftEmail(openaiKey, draftInput);
      const draftText = `${subject}\n\n${body}`;

      const draft = await createGmailDraft(
        payload.gmailAccessToken,
        lead.email,
        subject,
        body
      );
      const gmailThreadId = draft?.threadId ?? null;

      const { error } = await admin.from('leads').insert({
        user_id: payload.userId,
        business_type: business,
        city,
        country: payload.country ?? null,
        url: lead.url,
        email: lead.email,
        phone: lead.phone,
        linkedin: lead.linkedin,
        draft: draftText,
        gmail_thread_id: gmailThreadId,
        campaign_id: payload.campaignId ?? null,
        name: lead.title ?? null,
        preparation_summary: callPrep || null,
        date: new Date().toISOString(),
      });
      if (error) {
        errors.push(`Insert lead: ${error.message}`);
        continue;
      }
      leadsCreated++;
    } catch (e) {
      errors.push(`Lead ${lead.url}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { success: leadsCreated > 0, leadsCreated, errors };
}
