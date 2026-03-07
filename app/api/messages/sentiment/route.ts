import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { content } = await req.json().catch(() => ({}));
    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'content required' }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You analyze the sentiment of a business email reply. Respond with exactly one word: "positive", "neutral", or "negative". Positive = interested, open, wants to meet or learn more. Negative = not interested, unsubscribe, stop contact. Neutral = asking for info, unclear intent.',
        },
        { role: 'user', content: content.slice(0, 1000) },
      ],
      max_tokens: 5,
      temperature: 0,
    });

    const raw = response.choices[0]?.message?.content?.toLowerCase().trim() ?? '';
    const sentiment = raw.includes('positive') ? 'positive' : raw.includes('negative') ? 'negative' : 'neutral';
    return NextResponse.json({ sentiment });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
