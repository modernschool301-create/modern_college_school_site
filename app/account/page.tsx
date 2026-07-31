import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { NameForm, PasswordForm } from '@/components/account/account-forms';
import { USER_ROLE_LABELS, type UserRole } from '@/lib/users';

// My Account (PRD 30.2). Any signed-in staff member edits their own name and
// password. Middleware already requires a session for /account/:path*; this
// re-checks rather than assuming, because a page that reads `user.id` must not
// depend on an upstream guard for correctness.
//
// Deliberately NOT under /admin: a deactivated account can still reach this page
// and change its own password, while remaining unable to write content or open
// anything in the admin area.
export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name, role, is_active')
    .eq('id', user.id)
    .single();

  const email = profile?.email ?? user.email ?? '';
  const role = (profile?.role as UserRole | undefined) ?? 'admin';

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="font-display text-h2 text-green-ink">My account</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">
        Your own details. Everything else about your account — what you may do,
        and whether it is active — is managed by the site owner.
      </p>

      <section className="mt-10">
        <h2 className="font-display text-h3 text-green-ink">Sign-in details</h2>
        <dl className="mt-4 max-w-md space-y-3 rounded-md border border-line p-4 text-sm">
          <div>
            <dt className="font-medium">Email address</dt>
            {/* Shown, never editable here. Changing the address a person signs
                in with is an account-management action, not a self-service one:
                the profiles_update_own policy pins this column, so a form field
                would be a control that always fails. */}
            <dd className="mt-0.5 text-ink-muted">{email}</dd>
          </div>
          <div>
            <dt className="font-medium">Role</dt>
            <dd className="mt-0.5 text-ink-muted">{USER_ROLE_LABELS[role]}</dd>
          </div>
        </dl>
        <p className="mt-3 max-w-md text-small text-ink-muted">
          To change your email address, ask the owner.
        </p>
      </section>

      <hr className="mt-12 border-line" />

      <section className="mt-12">
        <h2 className="font-display text-h3 text-green-ink">Your name</h2>
        <p className="mt-2 max-w-md text-sm text-ink-muted">
          Shown in the admin header and on the staff list.
        </p>
        <NameForm fullName={profile?.full_name ?? ''} />
      </section>

      <hr className="mt-12 border-line" />

      <section className="mt-12">
        <h2 className="font-display text-h3 text-green-ink">Password</h2>
        <PasswordForm />
      </section>

      <p className="mt-12 text-sm">
        <Link href="/admin" className="text-green-brand hover:underline">
          ← Back to the admin area
        </Link>
      </p>
    </main>
  );
}
