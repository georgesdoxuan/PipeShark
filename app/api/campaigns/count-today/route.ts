import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { sumTodayCreditsUsedForUser } from '@/lib/supabase-campaigns';

const DAILY_LIMIT = 300;

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const count = await sumTodayCreditsUsedForUser(user.id);
    const remaining = Math.max(0, DAILY_LIMIT - count);

    return NextResponse.json({
      count,
      remaining,
      limit: DAILY_LIMIT,
    });
  } catch (error: any) {
    console.error('Error counting today credits:', error.message);
    return NextResponse.json(
      { error: 'Failed to count credits', details: error.message },
      { status: 500 }
    );
  }
}
