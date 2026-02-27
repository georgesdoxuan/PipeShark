import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getCampaignsByIdsAdmin } from '@/lib/supabase-campaigns';

/**
 * GET /api/messages/conversations
 * Returns leads that have a Gmail thread (gmail_thread_id), for the messaging inbox.
 */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, email, replied, replied_at, gmail_thread_id, campaign_id')
    .eq('user_id', user.id)
    .not('gmail_thread_id', 'is', null)
    .order('replied_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('[messages/conversations]', error);
    return NextResponse.json({ error: 'Failed to load conversations' }, { status: 500 });
  }

  const list = (leads || []).map((r: any) => ({
    id: r.id,
    email: r.email ?? null,
    replied: !!r.replied,
    replied_at: r.replied_at ?? null,
    gmail_thread_id: r.gmail_thread_id,
    campaign_id: r.campaign_id ?? null,
  }));

  const campaignIds = [...new Set(list.map((c) => c.campaign_id).filter(Boolean))] as string[];
  const campaigns = campaignIds.length > 0 ? await getCampaignsByIdsAdmin(user.id, campaignIds) : [];
  const campaignNames: Record<string, string> = {};
  for (const c of campaigns) {
    campaignNames[c.id] = c.name ?? '';
  }

  const withNames = list.map((c) => ({
    ...c,
    campaignName: (c.campaign_id && campaignNames[c.campaign_id]) || null,
  }));

  return NextResponse.json({ conversations: withNames });
}
