import 'server-only';

import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

type ServerClient = Awaited<ReturnType<typeof createClient>>;

// Shared server-layer admin guards (PRD 9.1, 9.2). RLS remains the authoritative
// gate; these are defence-in-depth so a deactivated or demoted admin is handled
// cleanly instead of hitting a raw policy error. Like the /admin layout, the role
// is read LIVE from profiles via current_user_is_active_admin() — never from the
// session/JWT — so a deactivation bites on the account's very next action.

/**
 * Non-redirecting probe. Use in Route Handlers, which must answer with JSON and
 * cannot be thrown out of by redirect().
 */
export async function getActiveAdminContext(): Promise<{
  supabase: ServerClient;
  user: User | null;
  isAdmin: boolean;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { supabase, user: null, isAdmin: false };

  const { data } = await supabase.rpc('current_user_is_active_admin');

  return { supabase, user, isAdmin: !!data };
}

/**
 * Redirecting guard for Server Actions and pages. redirect() throws internally,
 * so this terminates the caller cleanly whether it returns a value or void.
 */
export async function requireActiveAdmin(): Promise<{
  supabase: ServerClient;
  user: User;
}> {
  const { supabase, user, isAdmin } = await getActiveAdminContext();

  if (!user || !isAdmin) {
    redirect('/login');
  }

  return { supabase, user };
}
