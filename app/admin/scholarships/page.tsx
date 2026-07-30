import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  ScholarshipList,
  type AdminScholarshipRow,
} from '@/components/admin/scholarships/scholarship-list';

// Admin-only (the /admin layout enforces the live active-admin check). The admin
// RLS policy returns ALL scholarships here, drafts included.
export default async function AdminScholarshipsPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from('scholarships')
    .select(
      'id, title, description, criteria, display_order, is_published, created_at',
    )
    .order('display_order', { ascending: true });

  const scholarships = (data ?? []) as AdminScholarshipRow[];

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-h2 text-green-ink">Scholarships</h1>
        <Link href="/admin/scholarships/new" className="btn-primary text-sm">
          New scholarship
        </Link>
      </div>

      <p className="mt-2 text-sm text-ink-muted">
        The Scholarships page lists published entries in this order.
      </p>

      <div className="mt-8">
        <ScholarshipList scholarships={scholarships} />
      </div>
    </main>
  );
}
