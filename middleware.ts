import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Protects every /admin and /account path. Public routes are NOT gated.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

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
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: getUser() revalidates the session with Supabase on every request.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role authorization is deliberately NOT done here. This middleware is
  // session-only BY DESIGN (PRD 3): it answers "is there a valid session?" and
  // nothing more. The admin/active check lives in the /admin layout, which reads
  // the role LIVE from `profiles` via current_user_is_active_admin() on every
  // request, so a demoted or deactivated admin loses access on their very next
  // action. Middleware runs on the edge of the request with only cookie/JWT
  // state to hand, so a role check here would either read a stale claim or add a
  // database round-trip to every matched request — and RLS is the real gate
  // regardless. Do not "fix" this by adding a role check here.

  return response;
}

export const config = {
  // Only run middleware on protected sections.
  matcher: ['/admin/:path*', '/account/:path*'],
};
