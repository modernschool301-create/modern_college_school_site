import Link from 'next/link';
import { AchievementForm } from '@/components/admin/achievements/achievement-form';
import { createAchievement } from '../actions';

export default function NewAchievementPage() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? '';

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href="/admin/achievements"
        className="text-sm text-ink-muted hover:text-ink"
      >
        ← Back to Achievements
      </Link>
      <h1 className="mt-3 font-display text-h2 text-green-ink">New achievement</h1>

      <div className="mt-8">
        <AchievementForm action={createAchievement} cloudName={cloudName} />
      </div>
    </main>
  );
}
