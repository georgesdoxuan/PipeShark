import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: 'Stripe is not configured. Add STRIPE_SECRET_KEY to .env.local' },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { priceId, mode = 'payment', successUrl, cancelUrl } = body;

    const origin = req.headers.get('origin') || req.nextUrl.origin;

    const session = await stripe.checkout.sessions.create({
      ...(priceId
        ? { line_items: [{ price: priceId, quantity: 1 }], mode: mode as 'payment' | 'subscription' }
        : {
            line_items: [
              {
                price_data: {
                  currency: 'eur',
                  product_data: {
                    name: 'PipeShark Pro',
                    description: 'Monthly credits and full access to PipeShark.',
                  },
                  unit_amount: 2900, // 29.00 EUR
                  recurring: mode === 'subscription' ? { interval: 'month' } : undefined,
                },
                quantity: 1,
              },
            ],
            mode: mode as 'payment' | 'subscription',
          }),
      success_url: successUrl || `${origin}/dashboard?success=true`,
      cancel_url: cancelUrl || `${origin}/pricing`,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
