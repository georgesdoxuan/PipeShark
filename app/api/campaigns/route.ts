import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getCampaignStatsForUser } from '@/lib/supabase-leads';

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawPeriod = searchParams.get('period') ?? 'month';
    const period = (rawPeriod === 'week' || rawPeriod === 'all') ? rawPeriod : 'month';
    const stats = await getCampaignStatsForUser(user.id, period);
    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('Error fetching stats:', error.message);
    return NextResponse.json(
      { error: 'Failed to fetch stats', details: error.message },
      { status: 500 }
    );
  }
}
