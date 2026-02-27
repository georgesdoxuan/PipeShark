/**
 * Gmail API helpers for reading threads and detecting replies.
 * Used by the check-replies sync.
 */

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

/**
 * Get the authenticated user's Gmail address (for when user_profiles.gmail_email is missing).
 */
export async function getGmailUserEmail(accessToken: string): Promise<string | null> {
  const res = await fetch(`${GMAIL_API}/profile`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const email = data.emailAddress;
  return typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : null;
}

export interface GmailThreadMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  payload?: {
    headers?: Array<{ name: string; value: string }>;
  };
}

export interface GmailThread {
  id: string;
  messages?: GmailThreadMessage[];
}

/** Message as returned for the messaging UI (thread view). */
export interface GmailThreadMessageDisplay {
  id: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  body: string;
  isFromUser: boolean;
}

/**
 * Fetch a thread by ID with message metadata (From header).
 * Returns null if thread not found or API error.
 */
export async function getGmailThread(
  accessToken: string,
  threadId: string
): Promise<GmailThread | null> {
  const url = `${GMAIL_API}/threads/${encodeURIComponent(threadId)}?format=metadata&metadataHeaders=From&metadataHeaders=To`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    if (res.status === 404) return null;
    const err = await res.text();
    console.error('Gmail thread fetch error:', res.status, err);
    return null;
  }
  return res.json();
}

/**
 * Extract header value from message payload.
 */
function getHeader(message: GmailThreadMessage, name: string): string | null {
  const headers = message.payload?.headers;
  if (!headers) return null;
  const h = headers.find((x) => x.name.toLowerCase() === name.toLowerCase());
  return h?.value?.trim() ?? null;
}

/**
 * Extract sender email from message payload headers.
 */
function getFromEmail(message: GmailThreadMessage): string | null {
  const from = getHeader(message, 'from');
  if (!from) return null;
  const match = from.match(/<([^>]+)>/);
  return match ? match[1].trim().toLowerCase() : from.trim().toLowerCase();
}

/**
 * Decode base64url body from Gmail API payload.
 */
function decodeBody(data: string | undefined): string {
  if (!data) return '';
  try {
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(base64, 'base64').toString('utf8');
  } catch {
    return '';
  }
}

/**
 * Extract plain text body from a message payload (body or first text part).
 */
function getMessageBody(payload: GmailThreadMessage['payload'] & { body?: { data?: string }; parts?: Array<{ mimeType?: string; body?: { data?: string } }> }): string {
  if (!payload) return '';
  if (payload.body?.data) return decodeBody(payload.body.data);
  const parts = payload.parts;
  if (!parts?.length) return '';
  const textPart = parts.find((p) => p.mimeType === 'text/plain' || (p.mimeType && p.mimeType.startsWith('text/')));
  return textPart?.body?.data ? decodeBody(textPart.body.data) : '';
}

/**
 * Fetch a thread with full message bodies for the messaging UI.
 * Returns messages sorted by internal date (oldest first).
 */
export async function getGmailThreadWithBodies(
  accessToken: string,
  threadId: string,
  userEmail: string
): Promise<GmailThreadMessageDisplay[]> {
  const url = `${GMAIL_API}/threads/${encodeURIComponent(threadId)}?format=full`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    if (res.status === 404) return [];
    const err = await res.text();
    console.error('[Gmail] getGmailThreadWithBodies failed', res.status, err);
    return [];
  }
  const thread = await res.json();
  const messages = (thread.messages || []) as (GmailThreadMessage & {
    payload?: { body?: { data?: string }; parts?: Array<{ mimeType?: string; body?: { data?: string } }> };
    snippet?: string;
    internalDate?: string;
  })[];
  const userLower = userEmail.trim().toLowerCase();
  const out: GmailThreadMessageDisplay[] = messages.map((msg) => {
    const from = getHeader(msg, 'From') ?? '';
    const to = getHeader(msg, 'To') ?? '';
    const fromEmail = getFromEmail(msg) ?? from;
    const isFromUser = fromEmail === userLower;
    const body = getMessageBody(msg.payload);
    const date = msg.internalDate
      ? new Date(parseInt(msg.internalDate, 10)).toISOString()
      : getHeader(msg, 'Date') ?? '';
    return {
      id: msg.id,
      from,
      to,
      date,
      snippet: msg.snippet ?? body.slice(0, 200),
      body: body || msg.snippet || '',
      isFromUser,
    };
  });
  out.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return out;
}

/**
 * Check if the thread contains at least one message from someone other than the user.
 * (i.e. a reply from the prospect)
 */
export function threadHasReplyFromRecipient(
  thread: GmailThread,
  userEmail: string
): boolean {
  const userEmailLower = userEmail.trim().toLowerCase();
  const messages = thread.messages || [];
  for (const msg of messages) {
    const from = getFromEmail(msg);
    if (from && from !== userEmailLower) {
      return true;
    }
  }
  return false;
}

/**
 * Check if the thread contains at least one message actually SENT by the user
 * (not drafts: only messages with label SENT count).
 */
export function threadHasMessageFromUser(
  thread: GmailThread,
  userEmail: string
): boolean {
  const userEmailLower = userEmail.trim().toLowerCase();
  const messages = thread.messages || [];
  for (const msg of messages) {
    const labels = msg.labelIds || [];
    // Only count messages that were really sent (in Sent folder), not drafts
    if (!labels.includes('SENT')) continue;
    const from = getFromEmail(msg);
    if (from && from === userEmailLower) {
      return true;
    }
  }
  return false;
}

/**
 * Check if the user has sent at least one email to the given recipient (search Gmail Sent).
 * Uses quoted address and to: OR cc: so we catch all sent emails to this address.
 */
export async function userHasSentEmailTo(
  accessToken: string,
  recipientEmail: string
): Promise<boolean> {
  const to = recipientEmail.trim().toLowerCase();
  if (!to || to === 'no email found') return false;
  // Quote the address so special chars (e.g. +) work; search both to: and cc:
  const q = `in:sent (to:"${to}" OR cc:"${to}")`;
  const url = `${GMAIL_API}/messages?q=${encodeURIComponent(q)}&maxResults=1`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('[Gmail] userHasSentEmailTo failed', res.status, err);
    return false;
  }
  const data = await res.json();
  const messages = data.messages || [];
  return messages.length > 0;
}

/**
 * Build RFC 2822 message and return base64url-encoded raw for Gmail API.
 */
function buildRawMessage(to: string, subject: string, body: string): string {
  const lines = [
    `To: ${to.trim()}`,
    `Subject: ${(subject || '').replace(/\r?\n/g, ' ') || '(No subject)'}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    body || '',
  ];
  const msg = lines.join('\r\n');
  const b64 = Buffer.from(msg, 'utf8').toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Create a Gmail draft via Gmail API (users.drafts.create).
 * Uses OAuth access token; draft appears in the authenticated user's Gmail.
 */
export async function createGmailDraft(
  accessToken: string,
  to: string,
  subject: string,
  body: string
): Promise<{ id: string; messageId: string } | null> {
  const raw = buildRawMessage(to, subject, body);
  const url = 'https://gmail.googleapis.com/gmail/v1/users/me/drafts';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: { raw } }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('[Gmail] createGmailDraft failed', res.status, err);
    return null;
  }
  const data = await res.json();
  const draftId = data.id;
  const messageId = data.message?.id;
  const threadId = data.message?.threadId ?? null;
  return draftId && messageId ? { id: draftId, messageId, threadId } : null;
}

/**
 * Send an email via Gmail API (users.messages.send).
 * Uses same RFC 2822 raw format as createGmailDraft.
 */
export async function sendGmailMessage(
  accessToken: string,
  to: string,
  subject: string,
  body: string
): Promise<{ id: string } | null> {
  const raw = buildRawMessage(to, subject, body);
  const url = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('[Gmail] sendGmailMessage failed', res.status, err);
    return null;
  }
  const data = await res.json();
  const id = data.id;
  return id ? { id } : null;
}
