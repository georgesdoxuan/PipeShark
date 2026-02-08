import { NextResponse } from 'next/server';
import { getCampaignsForUser } from '@/lib/supabase-campaigns';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const campaigns = await getCampaignsForUser(user.id);
    return NextResponse.json(campaigns);
  } catch (error: any) {
    console.error('Error fetching campaigns:', error.message);
    return NextResponse.json({ error: 'Failed to fetch campaigns', details: error.message }, { status: 500 });
  }
}
