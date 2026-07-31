'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { MIN_PASSWORD_LENGTH } from '@/lib/users';

export type AccountState = { error: string | null; saved: boolean };

// Self-service for any signed-in staff member (PRD 30.2). Deliberately narrow:
// a person may change their own NAME and their own PASSWORD, and nothing else.
//
// ┌─ WHAT THIS FILE CANNOT DO, AND WHY THAT IS NOT UP TO THIS FILE ───────────┐
// │ Role, active status, email and id are untouchable here — but not because  │
// │ these actions decline to send them. The profiles_update_own policy pins   │
// │ each of those columns to its currently-stored value, so an update that    │
// │ tried to change one fails at the database whatever the form posted.       │
// │ Promotion is reachable only through /admin/users, by the owner.           │
// └───────────────────────────────────────────────────────────────────────────┘
//
// Note this route is under /account, NOT /admin: middleware requires a session
// for both, but a DEACTIVATED account still reaches this page. That is
// intentional — it can change its own password, and still cannot write content
// or reach anything under /admin.

export async function updateOwnName(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const fullName = String(formData.get('full_name') ?? '').trim();
  if (!fullName) return { error: 'Please enter your name.', saved: false };

  // Only full_name is sent. `.eq('id', user.id)` scopes it to the caller's own
  // row; profiles_update_own would refuse any other row regardless.
  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', user.id);

  if (error) {
    console.error('[account] updateOwnName failed', error);
    return { error: 'Something went wrong saving your name. Please try again.', saved: false };
  }

  // The admin header shows this name on every page.
  revalidatePath('/account');
  revalidatePath('/admin', 'layout');
  return { error: null, saved: true };
}

export async function updateOwnPassword(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      saved: false,
    };
  }
  if (password !== confirm) {
    return { error: 'The two passwords do not match.', saved: false };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.error('[account] updateOwnPassword failed', error.message);
    return { error: 'Could not update your password. Please try again.', saved: false };
  }

  // Unlike the reset flow, this does NOT sign the user out: they are already
  // signed in and proved it by being here, and dumping someone back to /login
  // mid-session for changing their own password is a punishment, not a
  // safeguard. The reset flow signs out because it arrives from an emailed link.
  return { error: null, saved: true };
}
