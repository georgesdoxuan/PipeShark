import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getFoldersForUser, createFolder } from '@/lib/supabase-call-center-folders';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const folders = await getFoldersForUser(user.id);
    return NextResponse.json(folders);
  } catch (e: any) {
    console.error('GET /api/call-center/folders:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

    const folder = await createFolder(user.id, name);
    return NextResponse.json(folder);
  } catch (e: any) {
    console.error('POST /api/call-center/folders:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
