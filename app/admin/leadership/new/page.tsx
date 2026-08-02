import Link from 'next/link';
import { LeadershipForm } from '@/components/admin/leadership/leadership-form';
import { createLeadershipMessage } from '../actions';

export default function NewLeadershipMessagePage() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? '';

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href="/admin/leadership"
        className="text-sm text-ink-muted hover:text-ink"
      >
        ← Back to Leadership
      </Link>
      <h1 className="mt-3 font-display text-h2 text-green-ink">
        New leadership message
      </h1>

      <div className="mt-8">
        <LeadershipForm action={createLeadershipMessage} cloudName={cloudName} />
      </div>
    </main>
  );
}
