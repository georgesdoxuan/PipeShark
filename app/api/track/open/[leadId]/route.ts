import { createAdminClient } from '@/lib/supabase-server';

// 1x1 transparent GIF
const PIXEL_B64 = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const PIXEL = Buffer.from(PIXEL_B64, 'base64');

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const { leadId } = await params;
  if (leadId) {
    // Fire-and-forget — don't block the pixel response
    const admin = createAdminClient();
    void (async () => {
      try {
        await admin
          .from('leads')
          .update({ email_opened: true })
          .eq('id', leadId)
          .eq('email_opened', false);
      } catch {
        // ignore
      }
    })();
  }

  return new Response(PIXEL, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Pragma: 'no-cache',
    },
  });
}
