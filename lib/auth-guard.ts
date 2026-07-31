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

  const { data, error } = await supabase.rpc('current_user_is_active_admin');

  // A failed RPC and a legitimate `false` both arrive here as a falsy `data`, so
  // without this they are indistinguishable in the logs. Observability only: the
  // outcome is unchanged — an errored check still denies (fail closed).
  if (error) {
    console.error(
      '[auth-guard] current_user_is_active_admin RPC failed:',
      error.message,
    );
  }

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

/**
 * Non-redirecting owner probe. The owner tier is the ONLY role that may create
 * or manage staff accounts; a plain admin is not enough. Like the admin check
 * this reads the role LIVE from profiles through a SECURITY DEFINER function,
 * never from the session/JWT, so losing ownership bites on the next action.
 *
 * Use where the answer shapes the UI (hiding the Users link) rather than gating
 * it — hiding a control is never the enforcement.
 */
export async function isActiveOwner(supabase: ServerClient): Promise<boolean> {
  const { data, error } = await supabase.rpc('current_user_is_owner');

  // A failed RPC and a legitimate `false` both arrive as falsy `data`, so
  // without this they are indistinguishable in the logs. Observability only:
  // an errored check still denies (fail closed).
  if (error) {
    console.error('[auth-guard] current_user_is_owner RPC failed:', error.message);
  }
  return !!data;
}

/**
 * Redirecting guard for the Users page and every account-management action.
 *
 * A non-owner ADMIN is sent to /admin, not /login: they hold a perfectly valid
 * session and may use every other module, so signing them out would be a lie
 * about what went wrong. Someone with no session at all is still bounced to
 * /login by requireActiveAdmin() first.
 *
 * This is defence-in-depth, not the enforcement. The real gate is the
 * owner-only INSERT/UPDATE policy on profiles — a demoted owner who kept a page
 * open and posted the form anyway fails at the database.
 */
export async function requireActiveOwner(): Promise<{
  supabase: ServerClient;
  user: User;
}> {
  const { supabase, user } = await requireActiveAdmin();

  if (!(await isActiveOwner(supabase))) {
    redirect('/admin');
  }

  return { supabase, user };
}
