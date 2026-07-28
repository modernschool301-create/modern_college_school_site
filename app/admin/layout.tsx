import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { signOut } from './actions';

// Layer 2 of the enforcement model (PRD 3, 9.2). Middleware has already
// confirmed a SESSION exists; it does NOT check role. This layout runs on
// EVERY /admin request and confirms the session belongs to an ACTIVE ADMIN by
// reading profiles LIVE via current_user_is_active_admin() — never trusting a
// role baked into the JWT. That live read is what makes a deactivation or
// demotion bite on the account's very next action, not up to an hour later.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: isActiveAdmin } = await supabase.rpc(
    'current_user_is_active_admin',
  );

  if (!isActiveAdmin) {
    redirect('/login');
  }

  // Signed-in indicator. Reading the own row is permitted by the
  // profiles_select_own_or_admin policy (auth.uid() = id).
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single();

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
        <span className="text-sm font-semibold">Modern College &amp; School — Admin</span>
        <div className="flex items-center gap-4">
          <span className="text-right text-sm leading-tight">
            <span className="block font-medium">
              {profile?.full_name ?? 'Staff'}
            </span>
            <span className="block text-xs text-zinc-500 dark:text-zinc-400">
              {profile?.email ?? user.email}
            </span>
          </span>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Log out
            </button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}
