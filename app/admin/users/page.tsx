import { requireActiveOwner } from '@/lib/auth-guard';
import {
  CreateUserSection,
  UsersListSection,
  TransferOwnershipSection,
  type AdminUserRow,
} from '@/components/admin/users/users-sections';

// Users (PRD 30.1), revised: OWNER ONLY. Being an active admin is not enough to
// reach this page, unlike every other admin route.
//
// requireActiveOwner() runs before anything is read or rendered and sends a
// non-owner admin to /admin. That check is defence-in-depth and a courtesy — the
// real gate is the owner-only INSERT/UPDATE policy on profiles, so an admin who
// somehow reached this markup still could not change a single row.
export default async function AdminUsersPage() {
  const { supabase, user } = await requireActiveOwner();

  // Reading every profile is permitted by profiles_select_own_or_admin (an
  // active admin reads all) — the owner-only part is WRITING.
  const { data } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, is_active, created_at')
    .order('created_at', { ascending: true });

  const users = (data ?? []) as AdminUserRow[];

  // Ownership can only go to an ACTIVE ADMIN: not to a deactivated account
  // (a lockout with extra steps), and not to the current owner.
  const transferCandidates = users.filter(
    (u) => u.role === 'admin' && u.is_active,
  );

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="font-display text-h2 text-green-ink">Users</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">
        Staff accounts for the admin area. There is no public sign-up anywhere on
        this site — an account exists only because someone here created it.
      </p>

      <div className="mt-10">
        <CreateUserSection userCount={users.length} />
      </div>

      <hr className="mt-12 border-line" />

      <div className="mt-12">
        <UsersListSection users={users} currentUserId={user.id} />
      </div>

      <hr className="mt-12 border-line" />

      <div className="mt-12">
        <TransferOwnershipSection candidates={transferCandidates} />
      </div>
    </main>
  );
}
