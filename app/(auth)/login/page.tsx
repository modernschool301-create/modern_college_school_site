import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LoginForm } from './login-form';

// A visitor who already holds a valid active-admin session has no business on
// the login page — send them straight to /admin (PRD 25).
export default async function LoginPage() {
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

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold">Staff Log In</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        This area is for Modern College &amp; School staff only.
      </p>
      <LoginForm />
    </main>
  );
}
