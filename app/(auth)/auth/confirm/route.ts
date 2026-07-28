import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

// /auth/confirm — the single landing point for links the system emails
// (PRD 10.2). Right now that is the staff password-reset link; the same route
// will later serve staff invites, so it is written generically. It exchanges
// the emailed credential for a real session (expected and correct — the person
// who clicked the link must be signed in to set a new password) and forwards
// onward. It never renders UI and never leaks token details.

// Guard against open redirects: only ever forward to a local path.
function safeNext(next: string | null): string {
  if (next && next.startsWith('/') && !next.startsWith('//')) {
    return next;
  }
  return '/admin';
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  // PKCE flow sends `code`; the older email-OTP style sends `token_hash`+`type`.
  // Handle both so the route works regardless of how the template is wired.
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = safeNext(searchParams.get('next'));

  const supabase = await createClient();

  let ok = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    ok = !error;
  }

  if (ok) {
    // Session cookies are now set; forward to the reset/update page (or
    // whatever local `next` the link carried).
    return NextResponse.redirect(new URL(next, origin));
  }

  // Missing / invalid / expired credential — generic failure, no detail.
  return NextResponse.redirect(new URL('/login?error=auth', origin));
}
