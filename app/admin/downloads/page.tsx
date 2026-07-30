import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  DownloadList,
  type AdminDownloadRow,
} from '@/components/admin/downloads/download-list';

// Admin-only (the /admin layout enforces the live active-admin check). The admin
// RLS policy returns ALL downloads here, drafts included.
export default async function AdminDownloadsPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from('downloads')
    .select(
      'id, title, description, file, category, display_order, is_published, created_at',
    )
    .order('display_order', { ascending: true });

  const downloads = (data ?? []) as AdminDownloadRow[];

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-h2 text-green-ink">Downloads</h1>
        <Link href="/admin/downloads/new" className="btn-primary text-sm">
          New download
        </Link>
      </div>

      <p className="mt-2 text-sm text-ink-muted">
        The Downloads page groups published files by category, in this order.
      </p>

      <div className="mt-8">
        <DownloadList downloads={downloads} />
      </div>
    </main>
  );
}
