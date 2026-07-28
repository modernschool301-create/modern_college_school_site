import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ResetForm } from './reset-form';

// A signed-in visitor has no reason to request a reset — send them to /admin.
// (The reset flow itself never lands here signed in: /auth/confirm forwards
// straight to /reset-password/update.)
export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/admin');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold">Reset your password</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Enter your staff email and we&apos;ll send you a link to set a new password.
      </p>
      <ResetForm />
      <p className="mt-6 text-sm">
        <Link href="/login" className="underline underline-offset-4">
          Back to log in
        </Link>
      </p>
    </main>
  );
}
