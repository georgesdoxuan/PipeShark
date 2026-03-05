import { createServerSupabaseClient } from './supabase-server';

export interface CallCenterFolder {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export async function getFoldersForUser(userId: string): Promise<CallCenterFolder[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('call_center_folders')
    .select('id, user_id, name, created_at')
    .eq('user_id', userId)
    .order('name', { ascending: true });

  if (error) throw error;
  return (data ?? []) as CallCenterFolder[];
}

export async function createFolder(userId: string, name: string): Promise<CallCenterFolder> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('call_center_folders')
    .insert({ user_id: userId, name: name.trim() })
    .select('id, user_id, name, created_at')
    .single();

  if (error) throw error;
  return data as CallCenterFolder;
}

export async function deleteFolder(userId: string, folderId: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('call_center_folders')
    .delete()
    .eq('id', folderId)
    .eq('user_id', userId);

  if (error) throw error;
}
