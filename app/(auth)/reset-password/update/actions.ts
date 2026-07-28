'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type UpdateState = { error: string | null };

const MIN_LENGTH = 8;

export async function updatePassword(
  _prevState: UpdateState,
  formData: FormData,
): Promise<UpdateState> {
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');

  // Basic, permissive validation with generic messages.
  if (password.length < MIN_LENGTH) {
    return { error: `Password must be at least ${MIN_LENGTH} characters.` };
  }
  if (password !== confirm) {
    return { error: 'The two passwords do not match.' };
  }

  const supabase = await createClient();

  // This page requires the session established by /auth/confirm. If it is gone
  // (expired link, direct hit), there is nothing to update.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return {
      error:
        'Could not update your password. The reset link may have expired — please request a new one.',
    };
  }

  // Never leave a half-finished reset in an authenticated state: sign out so
  // the user logs in fresh with the new password (PRD 26).
  await supabase.auth.signOut();
  redirect('/login?reset=success');
}
