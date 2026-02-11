import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { deleteCompanyDescription, updateCompanyDescription } from '@/lib/supabase-company-descriptions';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { content, campaignName } = body;

    const updates: { content?: string; campaignName?: string } = {};
    if (content !== undefined) updates.content = typeof content === 'string' ? content : '';
    if (campaignName !== undefined) updates.campaignName = typeof campaignName === 'string' ? campaignName : '';

    const updated = await updateCompanyDescription(user.id, id, updates);
    if (!updated) {
      return NextResponse.json(
        { error: 'Company description not found or invalid (content min 50 characters)' },
        { status: 400 }
      );
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating company description:', error.message);
    return NextResponse.json(
      { error: 'Failed to update', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const success = await deleteCompanyDescription(user.id, id);

    if (!success) {
      return NextResponse.json(
        { error: 'Company description not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting company description:', error.message);
    return NextResponse.json(
      { error: 'Failed to delete company description', details: error.message },
      { status: 500 }
    );
  }
}
