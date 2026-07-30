import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AchievementForm } from '@/components/admin/achievements/achievement-form';
import { updateAchievement } from '../../actions';
import type { Achievement } from '@/lib/achievements';

export default async function EditAchievementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from('achievements')
    .select('*')
    .eq('id', id)
    .single();

  if (!data) notFound();

  const achievement = data as Achievement;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? '';

  // Bind the id so the form's action matches (state, formData) => state.
  const action = updateAchievement.bind(null, achievement.id);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href="/admin/achievements"
        className="text-sm text-ink-muted hover:text-ink"
      >
        ← Back to Achievements
      </Link>
      <h1 className="mt-3 font-display text-h2 text-green-ink">Edit achievement</h1>

      <div className="mt-8">
        <AchievementForm
          action={action}
          cloudName={cloudName}
          initial={{
            title: achievement.title,
            description: achievement.description,
            image: achievement.image,
            achieved_on: achievement.achieved_on,
            is_published: achievement.is_published,
          }}
        />
      </div>
    </main>
  );
}
