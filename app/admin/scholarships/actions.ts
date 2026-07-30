'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireActiveAdmin } from '@/lib/auth-guard';

export type ScholarshipFormState = { error: string | null };

// Generic message for DB failures. Raw Postgres text (e.g. "violates row-level
// security policy") is logged server-side, never surfaced to the browser.
const SAVE_FAILED =
  'Something went wrong saving this scholarship. Please try again.';

// The public Scholarships page (PRD 16) is the whole public refresh surface; the
// admin list also revalidates so a change shows without a hard reload. Unlike
// testimonials, the module name and the public route match.
function revalidatePublic() {
  revalidatePath('/scholarships');
}

type ScholarshipFields = {
  title: string;
  description: string | null;
  criteria: string | null;
  is_published: boolean;
};

function readScholarshipForm(
  formData: FormData,
): { value: ScholarshipFields } | { error: string } {
  const title = String(formData.get('title') ?? '').trim();
  if (!title) return { error: 'A title is required.' };

  const description = String(formData.get('description') ?? '').trim();
  const criteria = String(formData.get('criteria') ?? '').trim();

  return {
    value: {
      title,
      description: description || null,
      criteria: criteria || null,
      is_published: formData.get('is_published') === 'on',
    },
  };
}

export async function createScholarship(
  _prev: ScholarshipFormState,
  formData: FormData,
): Promise<ScholarshipFormState> {
  const { supabase, user } = await requireActiveAdmin();

  const parsed = readScholarshipForm(formData);
  if ('error' in parsed) return { error: parsed.error };
  const f = parsed.value;

  // New scholarships land at the end of the editor-controlled order.
  const { data: last } = await supabase
    .from('scholarships')
    .select('display_order')
    .order('display_order', { ascending: false })
    .limit(1);
  const nextOrder = (last?.[0]?.display_order ?? 0) + 1;

  const { error } = await supabase.from('scholarships').insert({
    title: f.title,
    description: f.description,
    criteria: f.criteria,
    display_order: nextOrder,
    is_published: f.is_published,
    created_by: user.id,
  });
  if (error) {
    console.error('[scholarships] createScholarship failed', error);
    return { error: SAVE_FAILED };
  }

  revalidatePublic();
  redirect('/admin/scholarships');
}

export async function updateScholarship(
  scholarshipId: string,
  _prev: ScholarshipFormState,
  formData: FormData,
): Promise<ScholarshipFormState> {
  const { supabase } = await requireActiveAdmin();

  const parsed = readScholarshipForm(formData);
  if ('error' in parsed) return { error: parsed.error };
  const f = parsed.value;

  // display_order is not part of the form — it is owned by the reorder controls.
  const { error } = await supabase
    .from('scholarships')
    .update({
      title: f.title,
      description: f.description,
      criteria: f.criteria,
      is_published: f.is_published,
    })
    .eq('id', scholarshipId);
  if (error) {
    console.error('[scholarships] updateScholarship failed', error);
    return { error: SAVE_FAILED };
  }

  revalidatePublic();
  redirect('/admin/scholarships');
}

export async function togglePublish(formData: FormData): Promise<void> {
  const { supabase } = await requireActiveAdmin();

  const id = String(formData.get('id') ?? '');
  const publish = String(formData.get('publish') ?? '') === 'true';
  if (!id) return;

  const { error } = await supabase
    .from('scholarships')
    .update({ is_published: publish })
    .eq('id', id);
  if (error) {
    console.error('[scholarships] togglePublish failed', error);
    return;
  }

  revalidatePublic();
  revalidatePath('/admin/scholarships');
}

export async function deleteScholarship(formData: FormData): Promise<void> {
  const { supabase } = await requireActiveAdmin();

  const id = String(formData.get('id') ?? '');
  if (!id) return;

  const { error } = await supabase.from('scholarships').delete().eq('id', id);
  if (error) {
    console.error('[scholarships] deleteScholarship failed', error);
    return;
  }

  revalidatePublic();
  revalidatePath('/admin/scholarships');
}

// Reorder by swapping display_order with the neighbour, the same approach as
// moveTestimonial.
export async function moveScholarship(formData: FormData): Promise<void> {
  const { supabase } = await requireActiveAdmin();

  const id = String(formData.get('id') ?? '');
  const direction = String(formData.get('direction') ?? '');
  if (!id || (direction !== 'up' && direction !== 'down')) return;

  const { data: rows } = await supabase
    .from('scholarships')
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
    .from('scholarships')
    .update({ display_order: b.display_order })
    .eq('id', a.id);
  await supabase
    .from('scholarships')
    .update({ display_order: a.display_order })
    .eq('id', b.id);

  revalidatePublic();
  revalidatePath('/admin/scholarships');
}
