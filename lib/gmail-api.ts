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
 * Extract sender email from message payload headers.
 */
function getFromEmail(message: GmailThreadMessage): string | null {
  const headers = message.payload?.headers;
  if (!headers) return null;
  const from = headers.find((h) => h.name.toLowerCase() === 'from');
  if (!from?.value) return null;
  const match = from.value.match(/<([^>]+)>/);
  return match ? match[1].trim().toLowerCase() : from.value.trim().toLowerCase();
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
