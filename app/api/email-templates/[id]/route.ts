import { NextResponse } from 'next/server';
import { deleteEmailTemplate } from '@/lib/supabase-email-templates';
import { createServerSupabaseClient } from '@/lib/supabase-server';

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
    const success = await deleteEmailTemplate(user.id, id);

    if (!success) {
      return NextResponse.json(
        { error: 'Email template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting email template:', error.message);
    return NextResponse.json(
      { error: 'Failed to delete email template', details: error.message },
      { status: 500 }
    );
  }
}
