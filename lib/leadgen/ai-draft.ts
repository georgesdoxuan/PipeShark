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
- ${input.emailMaxLength} words MAX for body
- Structure: [specific observation about THIS business] → [what we do that's relevant to THEM] → [CTA]
- The first sentence MUST mention the business by name (${input.businessName}) AND reference something specific (a service, their rating, something from their website). Example: "Noticed ${input.businessName} offers [specific service X]..." or "Saw ${input.businessName} has [specific fact]..."
- Mention briefly that you found their email on their website (legal obligation, one short sentence). Keep it casual, one sentence max.
- Signature: just first name, no title.

PUNCTUATION (follow exactly):
- Use periods and commas only. No exclamation marks (!). No ellipsis (...). No semicolons (;). No em-dashes (—) or en-dashes (–). No hyphens used as pauses.
- One idea per sentence. Two sentences max per paragraph. Never use bullet points or lists in the body.
- Sentences vary in length: mix short (3-6 words) with medium (10-15 words). Never write three consecutive sentences of similar length.

TONE & STYLE:
- Write like a real person typing a quick email, not a marketing copy. Read it aloud — if it sounds like an ad, rewrite it.
- Start sentences with "And" or "But" when it feels natural.
- Use contractions everywhere: it's, you're, we've, that's, can't, won't, I'd.
- Never open with "I am reaching out", "I hope this finds you well", "My name is", or any variant. Get straight to the point.

BANNED WORDS (never use any of these):
crucial, leverage, unlock, empower, elevate, seamless, game-changer, cutting-edge, robust, scalable, holistic, transformative, comprehensive, groundbreaking, revolutionize, ecosystem, synergy, paradigm, delve, pivotal, streamline, impactful, proactive, dynamic, tailored, bespoke, innovative, solution, solutions, optimize, optimize, foster, navigate, harness, spearhead, endeavor, facilitate, implement, utilize, leverage, orchestrate, curate, supercharge, skyrocket, resonate, captivate, amplify

===== LEAD INFO =====
Business Name: ${input.businessName}
Business Type: ${input.business}
City: ${input.city}
Website URL: ${input.websiteUrl}
${input.hasdataExtra ? `\nGoogle Maps Data:\n${input.hasdataExtra}` : ''}
WEBSITE SUMMARY:
${input.websiteSummary}

PERSONALIZATION RULE (mandatory): The very first sentence MUST:
1. Name the business: "${input.businessName}"
2. Reference ONE specific fact from the data above (a real service they offer, their exact rating + number of reviews, a specific detail from their website or Maps description)

BAD example (forbidden): "Running out of tools can slow you down." — generic, could be anyone
GOOD example: "Noticed ${input.businessName} handles emergency plumbing 24/7 — that kind of availability must keep you busy."
GOOD example: "Saw ${input.businessName} has 4.8 stars across 120 reviews — clearly you're doing something right."

Do NOT invent facts. Only use what is in the data above. If data is limited, use what's available (city, business type, website URL).

Write a cold email that makes them want to reply. Return only the JSON object.`;

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
