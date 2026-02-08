import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSchedule, setSchedule } from '@/lib/supabase-schedule';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const launchTime = await getSchedule(user.id);
    return NextResponse.json({ launchTime });
  } catch (error: any) {
    console.error('Error fetching schedule:', error.message);
    return NextResponse.json(
      { error: 'Failed to fetch schedule', details: error.message },
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
    const { launchTime } = body;

    // Validate format HH:MM
    if (!launchTime || typeof launchTime !== 'string') {
      return NextResponse.json(
        { error: 'launchTime is required (format HH:MM)' },
        { status: 400 }
      );
    }

    const match = launchTime.match(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/);
    if (!match) {
      return NextResponse.json(
        { error: 'launchTime must be in HH:MM format (e.g. 17:43)' },
        { status: 400 }
      );
    }

    await setSchedule(user.id, launchTime);
    return NextResponse.json({ success: true, launchTime });
  } catch (error: any) {
    console.error('Error setting schedule:', error.message);
    return NextResponse.json(
      { error: 'Failed to set schedule', details: error.message },
      { status: 500 }
    );
  }
}
