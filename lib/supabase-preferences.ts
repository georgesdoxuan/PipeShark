import { createAdminClient } from './supabase-server';
import { createServerSupabaseClient } from './supabase-server';

export type MailConnectionType = 'smtp' | 'gmail';

/**
 * Get user's mail connection preference (SMTP or Gmail) for queue send/draft.
 * Defaults to 'smtp' if not set or profile row missing.
 */
export async function getMailConnectionTypeForUser(userId: string): Promise<MailConnectionType> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('user_profiles')
    .select('mail_connection_type')
    .eq('id', userId)
    .maybeSingle();
  const v = (data as { mail_connection_type?: string } | null)?.mail_connection_type;
  return v === 'gmail' ? 'gmail' : 'smtp';
}

/**
 * Set mail connection type (server-side, e.g. cron). Uses admin client.
 */
export async function setMailConnectionTypeForUserAdmin(
  userId: string,
  value: MailConnectionType
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from('user_profiles')
    .update({
      mail_connection_type: value,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
  if (error) throw error;
}

/**
 * Get mail connection type for current session user (for Preferences page).
 */
export async function getMailConnectionTypeForSession(): Promise<MailConnectionType> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return 'smtp';
  const { data } = await supabase
    .from('user_profiles')
    .select('mail_connection_type')
    .eq('id', user.id)
    .single();
  const v = (data as { mail_connection_type?: string } | null)?.mail_connection_type;
  return v === 'gmail' ? 'gmail' : 'smtp';
}

/**
 * Update mail connection type for current session user.
 * Uses upsert so the profile row is created if missing (e.g. user never ran Gmail OAuth);
 * then email_queue.connection_type will be set correctly when enqueueing.
 */
export async function setMailConnectionTypeForSession(value: MailConnectionType): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) throw new Error('Unauthorized');
  const updated_at = new Date().toISOString();
  const { error } = await supabase
    .from('user_profiles')
    .upsert(
      { id: user.id, mail_connection_type: value, updated_at },
      { onConflict: 'id' }
    );
  if (error) throw error;
}
