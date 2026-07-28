import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { UpdateForm } from './update-form';

// Reached only via /auth/confirm, which establishes the recovery session
// (PRD 26). No session means the link was invalid, already used, or hit
// directly — send them to log in.
export default async function UpdatePasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold">Set a new password</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Choose a new password for your staff account.
      </p>
      <UpdateForm />
    </main>
  );
}
