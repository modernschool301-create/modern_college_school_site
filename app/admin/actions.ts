'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// Sign-out is a Server Action (not a layout read) so it can clear the session
// cookies, then send the user back to /login.
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
