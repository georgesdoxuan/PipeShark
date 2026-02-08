import { createServerSupabaseClient } from './supabase-server';

export interface EmailTemplate {
  id: string;
  name?: string;
  content: string;
  createdAt: string;
}

export async function getEmailTemplates(userId: string): Promise<EmailTemplate[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('email_templates')
    .select('id, name, content, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map((r) => ({
    id: r.id,
    name: r.name ?? undefined,
    content: r.content,
    createdAt: r.created_at,
  }));
}

export async function addEmailTemplate(
  userId: string,
  content: string,
  name?: string
): Promise<EmailTemplate | null> {
  const trimmed = content.trim();
  if (!trimmed) return null;

  const supabase = await createServerSupabaseClient();

  const { data: existing } = await supabase
    .from('email_templates')
    .select('id, content, created_at')
    .eq('user_id', userId)
    .eq('content', trimmed)
    .maybeSingle();
  if (existing) return { id: existing.id, name: name ?? undefined, content: existing.content, createdAt: existing.created_at };

  const { data, error } = await supabase
    .from('email_templates')
    .insert({
      user_id: userId,
      content: trimmed,
      name: name?.trim() || null,
    })
    .select('id, name, content, created_at')
    .single();

  if (error) throw error;
  return {
    id: data.id,
    name: data.name ?? undefined,
    content: data.content,
    createdAt: data.created_at,
  };
}

export async function deleteEmailTemplate(userId: string, id: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('email_templates')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  return !error;
}
