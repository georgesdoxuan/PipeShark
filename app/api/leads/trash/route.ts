import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getTrashedLeadsForUser, setLeadsTrashed, deleteTrashedLeads } from '@/lib/supabase-leads';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const leads = await getTrashedLeadsForUser(user.id);
    return NextResponse.json(leads);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { leadIds, action } = body as { leadIds: string[]; action: 'trash' | 'restore' | 'delete' };

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: 'leadIds required' }, { status: 400 });
    }

    let ok: boolean;
    if (action === 'delete') {
      ok = await deleteTrashedLeads(user.id, leadIds);
    } else {
      ok = await setLeadsTrashed(user.id, leadIds, action !== 'restore');
    }

    if (!ok) return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
