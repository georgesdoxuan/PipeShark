import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import {
  listSenderAccounts,
  listSenderAccountsWithPasswords,
  createSenderAccount,
  type CreateSenderAccountInput,
} from '@/lib/supabase-sender-accounts';

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const withPasswords = searchParams.get('withPasswords') === '1';
    const accounts = withPasswords
      ? await listSenderAccountsWithPasswords(user.id)
      : await listSenderAccounts(user.id);
    return NextResponse.json({ accounts });
  } catch (error: any) {
    console.error('sender-accounts GET:', error);
    return NextResponse.json(
      { error: 'Failed to list sender accounts', details: error.message },
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
    const {
      email,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPassword,
      imapHost,
      imapPort,
      isPrimary,
    } = body as CreateSenderAccountInput & { smtpPassword: string };
    if (!email?.trim() || !smtpHost?.trim() || smtpPort == null || !smtpPassword) {
      return NextResponse.json(
        { error: 'Missing required fields: email, smtpHost, smtpPort, smtpPassword' },
        { status: 400 }
      );
    }
    const account = await createSenderAccount(user.id, {
      email: email.trim(),
      smtpHost: smtpHost.trim(),
      smtpPort: Number(smtpPort),
      smtpUser: smtpUser?.trim(),
      smtpPassword,
      imapHost: imapHost?.trim(),
      imapPort: imapPort != null ? Number(imapPort) : undefined,
      isPrimary: !!isPrimary,
    });
    return NextResponse.json({ account });
  } catch (error: any) {
    console.error('sender-accounts POST:', error);
    return NextResponse.json(
      { error: 'Failed to create sender account', details: error.message },
      { status: 500 }
    );
  }
}
