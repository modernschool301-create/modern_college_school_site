import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  AchievementList,
  type AdminAchievementRow,
} from '@/components/admin/achievements/achievement-list';

// Admin-only (the /admin layout enforces the live active-admin check). The admin
// RLS policy returns ALL achievements here, drafts included.
export default async function AdminAchievementsPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from('achievements')
    .select('id, title, image, achieved_on, display_order, is_published, created_at')
    .order('display_order', { ascending: true });

  const achievements = (data ?? []) as AdminAchievementRow[];
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? '';

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-h2 text-green-ink">Achievements</h1>
        <Link href="/admin/achievements/new" className="btn-primary text-sm">
          New achievement
        </Link>
      </div>

      <p className="mt-2 text-sm text-ink-muted">
        The public page lists published achievements in this order.
      </p>

      <div className="mt-8">
        <AchievementList achievements={achievements} cloudName={cloudName} />
      </div>
    </main>
  );
}
