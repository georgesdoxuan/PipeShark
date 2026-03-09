import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { updatePreset, deletePreset } from '@/lib/supabase-campaign-presets';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const body = await request.json();
    const updated = await updatePreset(user.id, id, {
      name: body.name,
      businessType: body.businessType,
      companyDescription: body.companyDescription,
      toneOfVoice: body.toneOfVoice,
      campaignGoal: body.campaignGoal,
      magicLink: body.magicLink,
      citySize: body.citySize,
      cities: body.cities,
      businessLinkText: body.businessLinkText,
      emailMaxLength: body.emailMaxLength,
      exampleEmail: body.exampleEmail,
      aiInstructions: body.aiInstructions,
    });
    if (!updated) return NextResponse.json({ error: 'Preset not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Failed to update preset' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const ok = await deletePreset(user.id, id);
    if (!ok) return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete preset' }, { status: 500 });
  }
}
