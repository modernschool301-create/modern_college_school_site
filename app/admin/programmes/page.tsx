import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  ProgrammeList,
  type AdminProgrammeRow,
} from '@/components/admin/programmes/programme-list';

// The embedded aggregate PostgREST returns for `programme_faculty(count)`.
type ProgrammeWithCount = Omit<AdminProgrammeRow, 'faculty_count'> & {
  programme_faculty: { count: number }[];
};

// Admin-only (the /admin layout enforces the live active-admin check). The admin
// RLS policy returns ALL programmes here, drafts included.
export default async function AdminProgrammesPage() {
  const supabase = await createClient();

  // The faculty count comes back as an embedded aggregate rather than N
  // follow-up queries — one round trip for the whole list.
  const { data } = await supabase
    .from('programmes')
    .select(
      'id, slug, title, level, cover_image, display_order, is_published, programme_faculty(count)',
    )
    .order('display_order', { ascending: true });

  const programmes: AdminProgrammeRow[] = (
    (data ?? []) as ProgrammeWithCount[]
  ).map(({ programme_faculty, ...programme }) => ({
    ...programme,
    faculty_count: programme_faculty?.[0]?.count ?? 0,
  }));

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? '';

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-h2 text-green-ink">Programmes</h1>
        <Link href="/admin/programmes/new" className="btn-primary text-sm">
          New programme
        </Link>
      </div>

      <p className="mt-2 text-sm text-ink-muted">
        The Programmes page lists published programmes in this order. Open a
        programme to edit its description and manage its faculty.
      </p>

      <div className="mt-8">
        <ProgrammeList programmes={programmes} cloudName={cloudName} />
      </div>
    </main>
  );
}
