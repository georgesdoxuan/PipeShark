import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import {
  getCompanyDescriptions,
  addCompanyDescription,
} from '@/lib/supabase-company-descriptions';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const descriptions = await getCompanyDescriptions(user.id);
    return NextResponse.json(descriptions);
  } catch (error: any) {
    console.error('Error fetching company descriptions:', error.message);
    return NextResponse.json(
      { error: 'Failed to fetch company descriptions', details: error.message },
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
    const { content } = body;

    if (!content || typeof content !== 'string' || content.trim().length < 50) {
      return NextResponse.json(
        { error: 'Content must be at least 50 characters' },
        { status: 400 }
      );
    }

    const added = await addCompanyDescription(user.id, content.trim());
    if (!added) {
      return NextResponse.json(
        { message: 'Description already saved', descriptions: await getCompanyDescriptions(user.id) },
        { status: 200 }
      );
    }

    const descriptions = await getCompanyDescriptions(user.id);
    return NextResponse.json({ added, descriptions });
  } catch (error: any) {
    console.error('Error adding company description:', error.message);
    return NextResponse.json(
      { error: 'Failed to add company description', details: error.message },
      { status: 500 }
    );
  }
}
