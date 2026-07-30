'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireActiveAdmin } from '@/lib/auth-guard';

export type AchievementFormState = { error: string | null };

// Generic message for DB failures. Raw Postgres text (e.g. "violates row-level
// security policy") is logged server-side, never surfaced to the browser.
const SAVE_FAILED =
  'Something went wrong saving this achievement. Please try again.';

// Only the public Achievements page reads this table (PRD 10.5, 19) — no
// homepage section does, so this is the whole refresh surface.
function revalidatePublic() {
  revalidatePath('/achievements');
}

type AchievementFields = {
  title: string;
  description: string | null;
  image: string | null;
  achieved_on: string | null;
  is_published: boolean;
};

function readAchievementForm(
  formData: FormData,
): { value: AchievementFields } | { error: string } {
  const title = String(formData.get('title') ?? '').trim();
  if (!title) return { error: 'A title is required.' };

  const description = String(formData.get('description') ?? '').trim();
  const image = String(formData.get('image') ?? '').trim();
  const achievedOn = String(formData.get('achieved_on') ?? '').trim();

  return {
    value: {
      title,
      description: description || null,
      image: image || null,
      achieved_on: achievedOn || null,
      is_published: formData.get('is_published') === 'on',
    },
  };
}

export async function createAchievement(
  _prev: AchievementFormState,
  formData: FormData,
): Promise<AchievementFormState> {
  const { supabase, user } = await requireActiveAdmin();

  const parsed = readAchievementForm(formData);
  if ('error' in parsed) return { error: parsed.error };
  const f = parsed.value;

  // New achievements land at the end of the editor-controlled order.
  const { data: last } = await supabase
    .from('achievements')
    .select('display_order')
    .order('display_order', { ascending: false })
    .limit(1);
  const nextOrder = (last?.[0]?.display_order ?? 0) + 1;

  const { error } = await supabase.from('achievements').insert({
    title: f.title,
    description: f.description,
    image: f.image,
    achieved_on: f.achieved_on,
    display_order: nextOrder,
    is_published: f.is_published,
    created_by: user.id,
  });
  if (error) {
    console.error('[achievements] createAchievement failed', error);
    return { error: SAVE_FAILED };
  }

  revalidatePublic();
  redirect('/admin/achievements');
}

export async function updateAchievement(
  achievementId: string,
  _prev: AchievementFormState,
  formData: FormData,
): Promise<AchievementFormState> {
  const { supabase } = await requireActiveAdmin();

  const parsed = readAchievementForm(formData);
  if ('error' in parsed) return { error: parsed.error };
  const f = parsed.value;

  // display_order is not part of the form — it is owned by the reorder controls.
  const { error } = await supabase
    .from('achievements')
    .update({
      title: f.title,
      description: f.description,
      image: f.image,
      achieved_on: f.achieved_on,
      is_published: f.is_published,
    })
    .eq('id', achievementId);
  if (error) {
    console.error('[achievements] updateAchievement failed', error);
    return { error: SAVE_FAILED };
  }

  revalidatePublic();
  redirect('/admin/achievements');
}

export async function togglePublish(formData: FormData): Promise<void> {
  const { supabase } = await requireActiveAdmin();

  const id = String(formData.get('id') ?? '');
  const publish = String(formData.get('publish') ?? '') === 'true';
  if (!id) return;

  const { error } = await supabase
    .from('achievements')
    .update({ is_published: publish })
    .eq('id', id);
  if (error) {
    console.error('[achievements] togglePublish failed', error);
    return;
  }

  revalidatePublic();
  revalidatePath('/admin/achievements');
}

export async function deleteAchievement(formData: FormData): Promise<void> {
  const { supabase } = await requireActiveAdmin();

  const id = String(formData.get('id') ?? '');
  if (!id) return;

  const { error } = await supabase.from('achievements').delete().eq('id', id);
  if (error) {
    console.error('[achievements] deleteAchievement failed', error);
    return;
  }

  revalidatePublic();
  revalidatePath('/admin/achievements');
}

// Reorder by swapping display_order with the neighbour, the same approach as
// moveCategory in the News module.
export async function moveAchievement(formData: FormData): Promise<void> {
  const { supabase } = await requireActiveAdmin();

  const id = String(formData.get('id') ?? '');
  const direction = String(formData.get('direction') ?? '');
  if (!id || (direction !== 'up' && direction !== 'down')) return;

  const { data: rows } = await supabase
    .from('achievements')
    .select('id, display_order')
    .order('display_order', { ascending: true });
  if (!rows) return;

  const index = rows.findIndex((r) => r.id === id);
  const swapWith = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= rows.length) return;

  const a = rows[index];
  const b = rows[swapWith];
  // Swap their display_order values.
  await supabase
    .from('achievements')
    .update({ display_order: b.display_order })
    .eq('id', a.id);
  await supabase
    .from('achievements')
    .update({ display_order: a.display_order })
    .eq('id', b.id);

  revalidatePublic();
  revalidatePath('/admin/achievements');
}
