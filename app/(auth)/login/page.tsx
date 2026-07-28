import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LoginForm } from './login-form';

// A visitor who already holds a valid active-admin session has no business on
// the login page — send them straight to /admin (PRD 25).
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string; error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: isActiveAdmin } = await supabase.rpc(
      'current_user_is_active_admin',
    );
    if (isActiveAdmin) {
      redirect('/admin');
    }
  }

  // Indicators forwarded by the reset flow: success from the update page,
  // a generic failure from /auth/confirm on an invalid/expired link.
  const params = await searchParams;
  const notice =
    params.reset === 'success'
      ? 'Your password has been reset. Please log in with your new password.'
      : null;
  const errorNotice =
    params.error === 'auth'
      ? 'That link is invalid or has expired. Please request a new one.'
      : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold">Staff Log In</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        This area is for Modern College &amp; School staff only.
      </p>

      {notice && (
        <p
          role="status"
          className="mt-6 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-400"
        >
          {notice}
        </p>
      )}
      {errorNotice && (
        <p
          role="alert"
          className="mt-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400"
        >
          {errorNotice}
        </p>
      )}

      <LoginForm />

      <p className="mt-6 text-sm">
        <Link href="/reset-password" className="underline underline-offset-4">
          Forgot your password?
        </Link>
      </p>
    </main>
  );
}
