import { createServerSupabaseClient } from './supabase-server';

export type TodoStatus = 'todo' | 'doing' | 'done';

export interface Todo {
  id: string;
  title: string;
  status: TodoStatus;
  createdAt: string;
}

function mapRecordToTodo(record: any): Todo {
  const status = (record.status === 'doing' || record.status === 'done' ? record.status : 'todo') as TodoStatus;
  return {
    id: record.id,
    title: record.title,
    status,
    createdAt: record.created_at,
  };
}

export async function getTodosForUser(userId: string): Promise<Todo[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapRecordToTodo);
}

export async function createTodo(userId: string, title: string): Promise<Todo> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('todos')
    .insert({ user_id: userId, title: title.trim(), status: 'todo' })
    .select()
    .single();

  if (error) throw error;
  return mapRecordToTodo(data);
}

export async function updateTodoStatus(
  userId: string,
  todoId: string,
  status: TodoStatus
): Promise<Todo | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('todos')
    .update({ status })
    .eq('id', todoId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) return null;
  return mapRecordToTodo(data);
}

export async function deleteTodo(userId: string, todoId: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from('todos')
    .delete()
    .eq('id', todoId)
    .eq('user_id', userId);

  return !error;
}
