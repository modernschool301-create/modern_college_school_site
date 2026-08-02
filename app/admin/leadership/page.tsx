import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  LeadershipList,
  type AdminLeadershipRow,
} from '@/components/admin/leadership/leadership-list';

// Admin-only (the /admin layout enforces the live active-admin check). The admin
// RLS policy returns ALL messages here, drafts included.
export default async function AdminLeadershipPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from('leadership_messages')
    .select(
      'id, name, title, photo, excerpt, full_message, display_order, is_published, created_at',
    )
    .order('display_order', { ascending: true });

  const messages = (data ?? []) as AdminLeadershipRow[];
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? '';

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-h2 text-green-ink">Leadership</h1>
        <Link href="/admin/leadership/new" className="btn-primary text-sm">
          New message
        </Link>
      </div>

      <p className="mt-2 text-sm text-ink-muted">
        The homepage shows published messages in this order.
      </p>

      <div className="mt-8">
        <LeadershipList messages={messages} cloudName={cloudName} />
      </div>
    </main>
  );
}
