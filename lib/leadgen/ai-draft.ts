/**
 * OpenAI calls for leadgen: summarize website, then generate cold email (subject + body).
 * Replaces n8n "Message a model" and "AI Agent" nodes.
 */

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';

async function chat(
  apiKey: string,
  systemContent: string | null,
  userContent: string,
  jsonMode: boolean = false
): Promise<string> {
  const messages: Array<{ role: string; content: string }> = [];
  if (systemContent) messages.push({ role: 'system', content: systemContent });
  messages.push({ role: 'user', content: userContent });

  const body: Record<string, unknown> = {
    model: MODEL,
    messages,
  };
  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch(OPENAI_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI ${res.status}: ${err.slice(0, 400)}`);
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content ?? '';
  return content.trim();
}

/**
 * Classify a prospect's reply as positive (interested) or negative (not interested, OOO, unsubscribe…).
 * Returns true for positive, false for negative. Returns false on error/empty.
 * Only called when a new reply is detected — not on every check — to save credits.
 */
export async function classifyReply(apiKey: string, replySnippet: string): Promise<boolean> {
  if (!replySnippet.trim()) return false;
  const userContent = `You are analyzing a prospect's reply to a cold outreach email. Classify it as POSITIVE or NEGATIVE.

POSITIVE: the prospect shows interest, asks a question, wants to know more, agrees to a call, or responds warmly.
NEGATIVE: unsubscribe request, "not interested", wrong contact, out-of-office auto-reply, rude/angry reply, or completely off-topic.

Reply snippet: "${replySnippet.slice(0, 500)}"

Return ONLY this JSON (no other text): {"positive": true} or {"positive": false}`;
  try {
    const raw = await chat(apiKey, null, userContent, true);
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned) as { positive?: boolean };
    return parsed.positive === true;
  } catch {
    return false;
  }
}

export async function summarizeWebsite(
  apiKey: string,
  cleanText: string,
  extraFields: string
): Promise<string> {
  const userContent = `Extract key facts from this business's website and Google Maps data. Be specific and factual — no generic filler.

WEBSITE CONTENT:
${cleanText}

GOOGLE MAPS DATA:
${extraFields}

Extract and list:
- Exact company name
- Specific services/specialties they offer (list each one)
- Google rating and review count if available
- Any unique differentiators (24/7, family-owned, years in business, certifications, etc.)
- Location details (neighborhoods served, service area)
- Any pricing or package info

Return 4-6 bullet points. Each bullet must be a concrete, specific fact. No generic statements like "they provide quality service".`;
  return chat(apiKey, null, userContent);
}

export async function generateCallPrep(
  apiKey: string,
  cleanText: string,
  businessName: string,
  businessType: string,
  city: string,
  url: string
): Promise<string> {
  const userContent = `You are preparing a cold call briefing sheet. Extract and list ALL relevant facts from this website content. No prose, no filler sentences. Use short bullet points grouped by category. Be exhaustive and specific.

BUSINESS: ${businessName} (${businessType}, ${city})
URL: ${url}

WEBSITE CONTENT:
${cleanText.slice(0, 6000)}

Output format (only include sections where you found data):
**Services**
- [list each service/product specifically]

**Team & Size**
- [number of employees if mentioned, founders, key staff]

**Clients / Target market**
- [who they serve, notable clients, sectors]

**Tech / Tools**
- [software, platforms, equipment mentioned]

**Pricing / Offers**
- [pricing tiers, packages, promotions if mentioned]

**Certifications / Awards**
- [any credentials, labels, certifications]

**Pain points / Challenges**
- [problems they mention, needs they express]

**Key facts**
- [founding year, address, hours, anything else relevant]

Be factual. If a section has no data, skip it entirely.`;
  return chat(apiKey, null, userContent);
}

export interface DraftEmailInput {
  companyDescription: string;
  toneOfVoice: string;
  campaignGoal: string;
  magicLink: string;
  exampleEmail: string;
  businessLinkText: string;
  /** Max words for the email body. Default 150. */
  emailMaxLength: number;
  /** Custom AI writing instructions injected into the prompt. */
  aiInstructions: string;
  business: string;
  businessName: string;
  city: string;
  websiteUrl: string;
  websiteSummary: string;
  hasdataExtra: string;
}

export async function generateDraftEmail(apiKey: string, input: DraftEmailInput): Promise<{ subject: string; body: string }> {
  const toneInstructions: Record<string, string> = {
    casual: '- Be friendly and approachable\n- Conversational language, lots of contractions\n- Warm and relatable',
    professional: '- Professional but not stuffy\n- Polished business language\n- Respectful and courteous',
    direct: '- Straight to the point, no fluff\n- Bold and confident tone\n- Action-oriented language',
    empathetic: '- Understanding and supportive tone\n- Focus on recipient\'s pain points with empathy',
  };
  const ctaByGoal: Record<string, string> = {
    book_call: 'Goal: Schedule a phone call or meeting. Keep it low-pressure. E.g. "Free for a 15-minute call this week?"',
    'Book a phone call': 'Goal: Schedule a phone call or meeting. Keep it low-pressure. E.g. "Free for a 15-minute call this week?"',
    free_audit: 'Goal: Offer a free audit/quote. Emphasize "no obligation" and "free".',
    'Offer a free audit/quote': 'Goal: Offer a free audit/quote. Emphasize "no obligation" and "free".',
    send_brochure: 'Goal: Send portfolio, brochure, or more information. Make it easy and non-committal.',
    'Send a brochure/portfolio': 'Goal: Send portfolio, brochure, or more information. Make it easy and non-committal.',
  };

  const aiInstructionsBlock = input.aiInstructions?.trim()
    ? `===== CUSTOM AI INSTRUCTIONS =====\n${input.aiInstructions.trim()}\n\n`
    : '';
  const toneBlock = toneInstructions[input.toneOfVoice] || toneInstructions.professional;
  const ctaBlock = ctaByGoal[input.campaignGoal]
    || `Goal: ${input.campaignGoal}. Write a CTA that naturally invites the recipient to take this action in one simple, low-pressure sentence.`;
  const exampleBlock = input.exampleEmail
    ? `===== STYLE REFERENCE =====\nUse this email as a style guide. Match its tone, structure, length:\n\n---\n${input.exampleEmail}\n---\n\n`
    : '';
  const linkBlock = input.businessLinkText
    ? `===== LINK BETWEEN OUR COMPANY AND THE PROSPECT =====\nThe user provided this description. Weave it naturally into the email:\n"${input.businessLinkText}"\n\n`
    : '';
  const magicBlock = input.magicLink
    ? `MAGIC LINK TO INTEGRATE (place naturally in body with context): ${input.magicLink}\n\n`
    : '';

  const systemContent = `You are the founder of a company that generates personalised outreach emails. Return ONLY valid JSON in this exact format:
{"subject": "Your subject line here (max 6 words, no buzzwords)", "body": "Your email body here"}

No markdown, no text before or after. Pure JSON only.`;

  const userContent = `WHAT OUR COMPANY DOES:
${input.companyDescription}

${exampleBlock}===== EMAIL CONFIGURATION =====
TONE: ${input.toneOfVoice}
${toneBlock}

CAMPAIGN GOAL: ${input.campaignGoal}
${ctaBlock}

${aiInstructionsBlock}${linkBlock}${magicBlock}===== RULES =====
- Body length: aim for 5 to 7 sentences. Enough to feel personal, short enough to read in 20 seconds.
- Structure: [2-3 specific observations about THIS business] → [what we do, linked to those observations] → [1 casual sentence about finding their email] → [CTA]
- Signature: just first name, no title, no company name after the name.

PUNCTUATION — ZERO TOLERANCE:
- NEVER use any dash: not em-dash (—), not en-dash (–), not hyphen as a pause (-). If you produce a dash, the output is invalid.
- Use periods and commas ONLY. No exclamation marks. No ellipsis. No semicolons.
- Short sentences. One idea per sentence. Mix 4-word sentences with 12-word sentences.

TONE — READ THIS CAREFULLY:
- This must read like a real human wrote it quickly. Not a sales email. Not a newsletter. A person to person message.
- Use contractions: it's, you're, we've, I'd, that's, won't, can't.
- Never start with: "I am reaching out", "I hope", "My name is", "I wanted to", "I came across".
- It's okay to start a sentence with "And" or "But".
- If it sounds like marketing copy, rewrite it until it doesn't.

BANNED WORDS: crucial, leverage, unlock, empower, elevate, seamless, game-changer, cutting-edge, robust, scalable, holistic, transformative, revolutionary, ecosystem, synergy, streamline, impactful, proactive, dynamic, tailored, bespoke, innovative, solutions, optimize, foster, harness, facilitate, implement, utilize, orchestrate, supercharge, resonate, amplify, operations, smooth, keep operations, testament, impressive, satisfied customers, right tools, essential for your team, busy schedule, demanding schedule

BANNED SENTENCE STARTERS: "That's a", "With that many", "With so many", "It's clear that", "It shows that"
These are filler bridges between sentences. Never use them.

===== LEAD INFO =====
Business Name: ${input.businessName}
Business Type: ${input.business}
City: ${input.city}
Website URL: ${input.websiteUrl}
${input.hasdataExtra ? `\nGoogle Maps Data:\n${input.hasdataExtra}` : ''}
WEBSITE SUMMARY:
${input.websiteSummary}

===== PERSONALIZATION — MOST IMPORTANT PART =====
You MUST use at least 2 DIFFERENT concrete facts from the data. Fact 1 opens the email. Fact 2 must be a separate data point — not just a conclusion drawn from fact 1.

STEP 1 — OPEN with one specific fact about this business:
- Use exact rating AND review count together if you have them. Write the real number, not "many reviews" or "countless reviews".
- Or quote something specific from a customer review.
- Or name 2-3 specific services they actually list.
- NEVER use "24/7" or "emergency service" as the opener. Every business in this category has that.

STEP 2 — Introduce a SECOND different specific fact, then connect it to what we offer:
- If step 1 was about their rating, step 2 must be about their services, a review quote, their city/neighborhood, their hours, or something else from the data.
- If step 1 was about services, step 2 must be about ratings, reviews, years in business, etc.
- The sentence must NOT be a conclusion from step 1. "That's impressive" or "With that many customers" are NOT step 2 — they just rephrase step 1.
- The connection to our company must follow logically from this second fact, not be invented.

STEP 3 — One short sentence about how you found their email, then the CTA.

EXAMPLE OF BAD EMAIL (rejected — DO NOT COPY this structure):
"San Antonio Plumbing has an impressive 4.8 stars from 312 reviews. That's a testament to the quality you provide in plumbing repair and water heater services. With so many satisfied customers, having the right tools available must be essential. At Pennio, we connect plumbers to local suppliers for quick rentals."
Problems: "impressive" and "testament" are filler, sentence 2 is just a conclusion from sentence 1 ("that's a testament"), sentence 3 is a generic inference that could apply to any plumber, no second real fact.

EXAMPLE OF GOOD EMAIL:
"Core Plumbing sits at 4.8 stars from 312 reviews in ${input.city}. You do water heater installs AND drain cleaning, so you're probably juggling very different parts and tools per job. Pennio connects you to local suppliers so you can get what you need same-day without driving across town. Found your email on your site. Free for 15 minutes this week?"
Why it works: real numbers (fact 1), specific services from their listing (fact 2, different data point), connection follows from fact 2 (different parts per job type), no dashes, no filler bridge sentences, sounds like a real person wrote it.

Only use facts from the data provided. Never invent ratings, review counts, services, or dates.

Return only the JSON object.`;

  const raw = await chat(apiKey, systemContent, userContent, true);
  try {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned) as { subject?: string; body?: string };
    return {
      subject: typeof parsed.subject === 'string' ? parsed.subject : 'Follow up',
      body: typeof parsed.body === 'string' ? parsed.body : raw,
    };
  } catch {
    return { subject: 'Follow up', body: raw };
  }
}

export interface FollowUpEmailInput {
  companyDescription: string;
  toneOfVoice: string;
  campaignGoal: string;
  magicLink: string;
  originalEmail: string;
  prospectReply: string;
  businessName: string;
}

export async function generateFollowUpEmail(
  apiKey: string,
  input: FollowUpEmailInput
): Promise<{ subject: string; body: string }> {
  // Only include magic link (Calendly, etc.) if prospect seems open to next steps
  const seemsInterested = /call|meeting|interested|schedule|yes|sure|tell me|more|when|available|book|talk|chat|how|works|sounds good|happy to/i.test(input.prospectReply);
  const linkBlock = input.magicLink && seemsInterested
    ? `If the prospect seems open to next steps, naturally include this link: ${input.magicLink}\n\n`
    : '';

  const systemContent = `You are writing a follow-up reply to a prospect who responded to a cold email. Return ONLY valid JSON:
{"subject": "Re: short subject", "body": "Email body here"}

No markdown, no text before or after. Pure JSON only.`;

  const userContent = `WHAT OUR COMPANY DOES:
${input.companyDescription}

TONE: ${input.toneOfVoice}
GOAL: ${input.campaignGoal}

===== ORIGINAL COLD EMAIL WE SENT =====
${input.originalEmail}

===== PROSPECT'S REPLY =====
${input.prospectReply}

${linkBlock}===== RULES =====
- 80 words MAX for the body
- Respond directly to what they said — feel like a real human reply, not a template
- If they're interested or asking questions: move things forward, suggest next steps
- If uncertain/objecting: acknowledge briefly, keep it light and low-pressure
- No exclamation marks. Contractions everywhere. Sign with just a first name.
- No buzzwords. One idea per sentence.

Write a natural reply that moves the conversation forward. Return only the JSON.`;

  const raw = await chat(apiKey, systemContent, userContent, true);
  try {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned) as { subject?: string; body?: string };
    return {
      subject: typeof parsed.subject === 'string' ? parsed.subject : 'Re: Follow up',
      body: typeof parsed.body === 'string' ? parsed.body : raw,
    };
  } catch {
    return { subject: 'Re: Follow up', body: raw };
  }
}
