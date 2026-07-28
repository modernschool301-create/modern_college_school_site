'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type LoginState = { error: string | null };

// ONE generic message for every failure. We never reveal whether an email is
// registered, whether the password was wrong, or whether the account is
// deactivated — all three look identical to an attacker (PRD 25).
const GENERIC_ERROR = 'Invalid email or password';

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { error: GENERIC_ERROR };
  }

  const supabase = await createClient();

  // a. Attempt sign-in.
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return { error: GENERIC_ERROR };
  }

  // c. A valid password is NOT enough. Re-check LIVE that this account is an
  // active admin. A deactivated or non-admin account must never hold a valid
  // session, so if the check fails we sign the just-created session back out
  // and return the same generic message.
  const { data: isActiveAdmin } = await supabase.rpc(
    'current_user_is_active_admin',
  );

  if (!isActiveAdmin) {
    await supabase.auth.signOut();
    return { error: GENERIC_ERROR };
  }

  // Only an active admin reaches here. redirect() throws, so it must live
  // outside any try/catch (there is none here) — the session cookies set by
  // signInWithPassword are already committed.
  redirect('/admin');
}
