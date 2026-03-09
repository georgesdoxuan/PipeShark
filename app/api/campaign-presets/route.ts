import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getPresetsForUser, createPreset } from '@/lib/supabase-campaign-presets';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const presets = await getPresetsForUser(user.id);
    return NextResponse.json(presets);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch presets' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Preset name is required' }, { status: 400 });
    }
    const preset = await createPreset(user.id, {
      name: body.name,
      businessType: body.businessType ?? undefined,
      companyDescription: body.companyDescription ?? undefined,
      toneOfVoice: body.toneOfVoice ?? undefined,
      campaignGoal: body.campaignGoal ?? undefined,
      magicLink: body.magicLink ?? undefined,
      citySize: body.citySize ?? undefined,
      cities: Array.isArray(body.cities) ? body.cities : undefined,
      businessLinkText: body.businessLinkText ?? undefined,
      emailMaxLength: typeof body.emailMaxLength === 'number' ? body.emailMaxLength : undefined,
      exampleEmail: body.exampleEmail ?? undefined,
      aiInstructions: body.aiInstructions ?? undefined,
    });
    return NextResponse.json(preset, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create preset' }, { status: 500 });
  }
}
