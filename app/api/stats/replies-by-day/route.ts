import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getRepliesPerDayForUser } from '@/lib/supabase-leads';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await getRepliesPerDayForUser(user.id, 7);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Replies-by-day error:', error.message);
    return NextResponse.json(
      { error: 'Failed to fetch', details: error.message },
      { status: 500 }
    );
  }
}
