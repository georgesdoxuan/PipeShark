import { NextResponse } from 'next/server';
import { getEmailTemplates, addEmailTemplate } from '@/lib/supabase-email-templates';
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

    const templates = await getEmailTemplates(user.id);
    return NextResponse.json(templates);
  } catch (error: any) {
    console.error('Error fetching email templates:', error.message);
    return NextResponse.json(
      { error: 'Failed to fetch email templates', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content, name } = body;

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    const added = await addEmailTemplate(user.id, content.trim(), name?.trim());
    if (!added) {
      const templates = await getEmailTemplates(user.id);
      return NextResponse.json({ message: 'Template already saved', templates }, { status: 200 });
    }

    const templates = await getEmailTemplates(user.id);
    return NextResponse.json({ added, templates });
  } catch (error: any) {
    console.error('Error adding email template:', error.message);
    return NextResponse.json(
      { error: 'Failed to add email template', details: error.message },
      { status: 500 }
    );
  }
}
