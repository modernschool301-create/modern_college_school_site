import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { signOut } from './actions';
import { AdminSidebar } from '@/components/admin/admin-sidebar';

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
      <header className="flex items-center justify-between border-b border-line px-6 py-3">
        <span className="text-sm font-semibold text-green-ink">Modern College &amp; School — Admin</span>
        <div className="flex items-center gap-4">
          <span className="text-right text-sm leading-tight">
            <span className="block font-medium text-ink">
              {profile?.full_name ?? 'Staff'}
            </span>
            <span className="block text-xs text-ink-muted">
              {profile?.email ?? user.email}
            </span>
          </span>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-sm border border-line px-3 py-1.5 text-sm font-medium transition-colors hover:bg-green-mist"
            >
              Log out
            </button>
          </form>
        </div>
      </header>

      <div className="md:flex">
        <aside className="border-b border-line md:w-56 md:shrink-0 md:border-b-0 md:border-r">
          <AdminSidebar />
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
