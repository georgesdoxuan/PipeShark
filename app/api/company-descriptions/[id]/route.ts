import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { deleteCompanyDescription } from '@/lib/supabase-company-descriptions';

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
