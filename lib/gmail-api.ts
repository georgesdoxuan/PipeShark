/**
 * Gmail API helpers for reading threads and detecting replies.
 * Used by the check-replies sync.
 */

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

export interface GmailThreadMessage {
  id: string;
  threadId: string;
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
