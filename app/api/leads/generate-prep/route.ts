import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server';
import { fetchPageHtml, cleanHtmlToText } from '@/lib/leadgen/scrape';
import { generateCallPrep } from '@/lib/leadgen/ai-draft';

/**
 * POST /api/leads/generate-prep
 * Generate detailed call preparation sheets for selected leads (on demand).
 * Body: { leadIds: string[] }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) return NextResponse.json({ error: 'OPENAI_API_KEY not set' }, { status: 500 });

    const body = await request.json().catch(() => ({}));
    const leadIds: string[] = Array.isArray(body.leadIds) ? body.leadIds : [];
    if (leadIds.length === 0) return NextResponse.json({ error: 'No leads selected' }, { status: 400 });
    if (leadIds.length > 20) return NextResponse.json({ error: 'Max 20 leads at once' }, { status: 400 });

    const admin = createAdminClient();
    const { data: leads, error } = await admin
      .from('leads')
      .select('id, url, name, business_type, city, country')
      .eq('user_id', user.id)
      .in('id', leadIds);

    if (error || !leads?.length) return NextResponse.json({ error: 'Leads not found' }, { status: 404 });

    const results: { id: string; success: boolean; error?: string }[] = [];

    for (const lead of leads) {
      try {
        const url = lead.url ?? '';
        const html = url ? await fetchPageHtml(url) : '';
        const cleanText = cleanHtmlToText(html);

        const prep = await generateCallPrep(
          openaiKey,
          cleanText,
          lead.name ?? lead.business_type ?? '',
          lead.business_type ?? '',
          lead.city ?? '',
          url
        );

        await admin
          .from('leads')
          .update({ preparation_summary: prep })
          .eq('id', lead.id)
          .eq('user_id', user.id);

        results.push({ id: lead.id, success: true });
      } catch (e) {
        results.push({ id: lead.id, success: false, error: e instanceof Error ? e.message : String(e) });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 500 });
  }
}
