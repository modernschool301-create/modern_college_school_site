'use server';

import { createClient } from '@/lib/supabase/server';

export type ResetRequestState = { done: boolean };

// Request a password-reset email. We NEVER reveal whether the address is
// registered (PRD 25 posture): every path returns the same `done` result, and
// the page shows one fixed confirmation regardless.
export async function requestReset(
  _prevState: ResetRequestState,
  formData: FormData,
): Promise<ResetRequestState> {
  const email = String(formData.get('email') ?? '').trim();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (email && siteUrl) {
    const supabase = await createClient();
    // The emailed link lands on /auth/confirm, which establishes the session
    // and forwards to the update page (PRD 10.2 / 26). resetPasswordForEmail
    // does not error on an unknown address, so there is nothing to leak.
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/confirm?next=/reset-password/update`,
    });
  }

  return { done: true };
}
