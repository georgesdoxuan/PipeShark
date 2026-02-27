import { NextResponse } from 'next/server';
import {
  getMailConnectionTypeForSession,
  setMailConnectionTypeForSession,
  type MailConnectionType,
} from '@/lib/supabase-preferences';

export async function GET() {
  try {
    const mailConnectionType = await getMailConnectionTypeForSession();
    return NextResponse.json({ mail_connection_type: mailConnectionType });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const value = body?.mail_connection_type as string | undefined;
    if (value !== 'smtp' && value !== 'gmail') {
      return NextResponse.json(
        { error: 'mail_connection_type must be "smtp" or "gmail"' },
        { status: 400 }
      );
    }
    await setMailConnectionTypeForSession(value as MailConnectionType);
    return NextResponse.json({ mail_connection_type: value });
  } catch (e: any) {
    if (e?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
