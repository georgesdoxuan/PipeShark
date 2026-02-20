import { createServerSupabaseClient } from './supabase-server';
import { createAdminClient } from './supabase-server';

const ENCRYPTION_KEY_ENV = 'SMTP_PASSWORD_ENCRYPTION_KEY'; // 32 bytes hex for AES-256
const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer | null {
  const keyHex = process.env[ENCRYPTION_KEY_ENV];
  if (!keyHex || keyHex.length !== 64) return null;
  return Buffer.from(keyHex, 'hex');
}

/** Encrypt SMTP password before storing. No-op if ENCRYPTION_KEY not set (store plain). */
export function encryptSmtpPassword(plain: string): string {
  const key = getEncryptionKey();
  if (!key) return plain;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require('crypto') as typeof import('crypto');
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGO, key, iv, { authTagLength: TAG_LENGTH });
    const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, enc]).toString('base64');
  } catch {
    return plain;
  }
}

/** Decrypt SMTP password when reading. Returns as-is if not encrypted. */
export function decryptSmtpPassword(encrypted: string | null): string {
  if (!encrypted) return '';
  const key = getEncryptionKey();
  if (!key) return encrypted;
  try {
    const buf = Buffer.from(encrypted, 'base64');
    if (buf.length < IV_LENGTH + TAG_LENGTH) return encrypted;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require('crypto') as typeof import('crypto');
    const iv = buf.subarray(0, IV_LENGTH);
    const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const enc = buf.subarray(IV_LENGTH + TAG_LENGTH);
    const decipher = crypto.createDecipheriv(ALGO, key, iv, { authTagLength: TAG_LENGTH });
    decipher.setAuthTag(tag);
    return decipher.update(enc) + decipher.final('utf8');
  } catch {
    return encrypted;
  }
}

export interface SenderAccountRecord {
  id: string;
  user_id: string;
  email: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string | null;
  smtp_pass_encrypted: string | null;
  imap_host: string | null;
  imap_port: number | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface SenderAccountPublic {
  id: string;
  email: string;
  smtpHost: string;
  smtpPort: number;
  imapHost: string | null;
  imapPort: number | null;
  isPrimary: boolean;
  createdAt: string;
}

function mapToPublic(r: SenderAccountRecord): SenderAccountPublic {
  return {
    id: r.id,
    email: r.email,
    smtpHost: r.smtp_host,
    smtpPort: r.smtp_port,
    imapHost: r.imap_host ?? null,
    imapPort: r.imap_port ?? null,
    isPrimary: !!r.is_primary,
    createdAt: r.created_at,
  };
}

export async function listSenderAccounts(userId: string): Promise<SenderAccountPublic[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('sender_accounts')
    .select('id, user_id, email, smtp_host, smtp_port, smtp_user, smtp_pass_encrypted, imap_host, imap_port, is_primary, created_at, updated_at')
    .eq('user_id', userId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map((r: any) => mapToPublic(r));
}

/** Get sender account by id (for current user). Returns record with decrypted password for sending. */
export async function getSenderAccountForUser(
  userId: string,
  senderAccountId: string
): Promise<{ email: string; smtpHost: string; smtpPort: number; smtpUser: string; smtpPass: string } | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('sender_accounts')
    .select('email, smtp_host, smtp_port, smtp_user, smtp_pass_encrypted')
    .eq('user_id', userId)
    .eq('id', senderAccountId)
    .single();
  if (error || !data) return null;
  const pass = decryptSmtpPassword(data.smtp_pass_encrypted);
  return {
    email: data.email,
    smtpHost: data.smtp_host,
    smtpPort: data.smtp_port,
    smtpUser: data.smtp_user || data.email,
    smtpPass: pass,
  };
}

/** For n8n (service role): get SMTP credentials by sender_account_id. */
export async function getSenderAccountByIdAdmin(senderAccountId: string): Promise<{
  email: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string | null;
  smtp_pass: string;
} | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('sender_accounts')
    .select('email, smtp_host, smtp_port, smtp_user, smtp_pass_encrypted')
    .eq('id', senderAccountId)
    .single();
  if (error || !data) return null;
  const pass = decryptSmtpPassword(data.smtp_pass_encrypted);
  return {
    email: data.email,
    smtp_host: data.smtp_host,
    smtp_port: data.smtp_port,
    smtp_user: data.smtp_user || data.email,
    smtp_pass: pass,
  };
}

/** Resolve sender_account_id from user_id + email (e.g. campaign.gmail_email). */
export async function getSenderAccountIdByEmail(userId: string, email: string | null): Promise<string | null> {
  if (email?.trim()) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('sender_accounts')
      .select('id')
      .eq('user_id', userId)
      .ilike('email', email.trim())
      .limit(1)
      .single();
    if (!error && data) return data.id;
  }
  return getPrimarySenderAccountId(userId);
}

/** Get the primary sender account id for a user (fallback when campaign has no gmail_email). */
export async function getPrimarySenderAccountId(userId: string): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('sender_accounts')
    .select('id')
    .eq('user_id', userId)
    .order('is_primary', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data.id;
}

export interface CreateSenderAccountInput {
  email: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser?: string;
  smtpPassword: string;
  imapHost?: string;
  imapPort?: number;
  isPrimary?: boolean;
}

export async function createSenderAccount(userId: string, input: CreateSenderAccountInput): Promise<SenderAccountPublic> {
  const supabase = await createServerSupabaseClient();
  const encrypted = encryptSmtpPassword(input.smtpPassword);
  const { data, error } = await supabase
    .from('sender_accounts')
    .insert({
      user_id: userId,
      email: input.email.trim(),
      smtp_host: input.smtpHost.trim(),
      smtp_port: input.smtpPort,
      smtp_user: input.smtpUser?.trim() || input.email.trim(),
      smtp_pass_encrypted: encrypted,
      imap_host: input.imapHost?.trim() || null,
      imap_port: input.imapPort ?? null,
      is_primary: !!input.isPrimary,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return mapToPublic(data);
}

export async function updateSenderAccountPassword(
  userId: string,
  senderAccountId: string,
  newPassword: string
): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const encrypted = encryptSmtpPassword(newPassword);
  const { error } = await supabase
    .from('sender_accounts')
    .update({ smtp_pass_encrypted: encrypted, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('id', senderAccountId);
  if (error) throw error;
}
