/**
 * Leadgen pipeline: HasData search → scrape → filter → limit → AI summarize + draft → Gmail draft → Supabase.
 * Replaces the full "Pipeshark Workflow" n8n workflow.
 */

import { createAdminClient } from '@/lib/supabase-server';
import { searchGoogleMapsLocal } from './hasdata';
import {
  fetchPageHtml,
  extractEmailFromHtml,
  cleanHtmlToText,
  extractPhoneAndLinkedIn,
  filterValidEmail,
  type ScrapedLead,
} from './scrape';
import { summarizeWebsite, generateDraftEmail, type DraftEmailInput } from './ai-draft';
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

  let localResults: Array<{ website?: string; url?: string; link?: string; title?: string; name?: string; [k: string]: unknown }>;
  try {
    localResults = await searchGoogleMapsLocal(business, city, apiKey);
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
    return { success: false, leadsCreated: 0, errors };
  }

  const scraped: ScrapedLead[] = [];
  for (const item of localResults) {
    const website = getWebsiteUrl(item);
    if (!website || !website.startsWith('http')) continue;
    const html = await fetchPageHtml(website);
    const email = extractEmailFromHtml(html);
    const cleanText = cleanHtmlToText(html);
    const { phone, linkedin } = extractPhoneAndLinkedIn(html, city);
    scraped.push({
      website,
      title: getTitle(item),
      email,
      url: website,
      html,
      cleanText,
      phone,
      linkedin,
    });
  }

  const filtered = scraped.filter(filterValidEmail);
  const limited = filtered.slice(0, targetCount);
  const admin = createAdminClient();

  for (const lead of limited) {
    try {
      const extraFields = [
        (lead as unknown as Record<string, unknown>).serviceOptions,
        (lead as unknown as Record<string, unknown>).description,
        (lead as unknown as Record<string, unknown>).price,
      ]
        .filter(Boolean)
        .map((v) => String(v))
        .join('\n');
      const websiteSummary = await summarizeWebsite(openaiKey, lead.cleanText, extraFields);

      const draftInput: DraftEmailInput = {
        companyDescription: payload.companyDescription ?? '',
        toneOfVoice: payload.toneOfVoice ?? 'professional',
        campaignGoal: payload.campaignGoal ?? 'book_call',
        magicLink: payload.magicLink ?? '',
        exampleEmail: payload.exampleEmail ?? '',
        businessLinkText: payload.businessLinkText ?? '',
        business,
        city,
        websiteUrl: lead.url,
        websiteSummary,
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
