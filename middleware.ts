import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Call getClaims() to refresh session - do not remove
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims?.sub ? { id: data.claims.sub } : null;

  const pathname = request.nextUrl.pathname;

  // Protected API routes - return 401 if not authenticated
  const isProtectedApi =
    pathname.startsWith('/api/leads') ||
    pathname.startsWith('/api/campaign/start') ||
    pathname.startsWith('/api/campaigns') ||
    pathname.startsWith('/api/todos') ||
    pathname.startsWith('/api/company-descriptions') ||
    pathname.startsWith('/api/email-templates');

  if (isProtectedApi && !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Dashboard, campaign, profile, preferences and todo routes - redirect to login if not authenticated
  const isProtectedPage =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/campaigns') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/preferences') ||
    pathname.startsWith('/todo');

  if (isProtectedPage && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user && (pathname === '/login' || pathname === '/signup')) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
