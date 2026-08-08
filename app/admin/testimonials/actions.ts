'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireActiveAdmin } from '@/lib/auth-guard';

export type TestimonialFormState = { error: string | null };

// Generic message for DB failures. Raw Postgres text (e.g. "violates row-level
// security policy") is logged server-side, never surfaced to the browser.
const SAVE_FAILED =
  'Something went wrong saving this testimonial. Please try again.';

// Two public surfaces: the Student's Voice page (PRD 18) and the homepage
// preview, which shows the first two published testimonials. The admin list
// also revalidates so a change shows without a hard reload. Note the route-name
// mismatch: the module is `testimonials`, the public route is
// `/students-voice`.
function revalidatePublic() {
  revalidatePath('/students-voice');
  revalidatePath('/'); // homepage Student's Voice preview
}

type TestimonialFields = {
  student_name: string;
  programme: string | null;
  quote: string;
  photo: string | null;
  is_published: boolean;
};

function readTestimonialForm(
  formData: FormData,
): { value: TestimonialFields } | { error: string } {
  const studentName = String(formData.get('student_name') ?? '').trim();
  if (!studentName) return { error: 'A student name is required.' };

  const quote = String(formData.get('quote') ?? '').trim();
  if (!quote) return { error: 'A quote is required.' };

  const programme = String(formData.get('programme') ?? '').trim();
  const photo = String(formData.get('photo') ?? '').trim();

  return {
    value: {
      student_name: studentName,
      programme: programme || null,
      quote,
      photo: photo || null,
      is_published: formData.get('is_published') === 'on',
    },
  };
}

export async function createTestimonial(
  _prev: TestimonialFormState,
  formData: FormData,
): Promise<TestimonialFormState> {
  const { supabase, user } = await requireActiveAdmin();

  const parsed = readTestimonialForm(formData);
  if ('error' in parsed) return { error: parsed.error };
  const f = parsed.value;

  // New testimonials land at the end of the editor-controlled order.
  const { data: last } = await supabase
    .from('testimonials')
    .select('display_order')
    .order('display_order', { ascending: false })
    .limit(1);
  const nextOrder = (last?.[0]?.display_order ?? 0) + 1;

  const { error } = await supabase.from('testimonials').insert({
    student_name: f.student_name,
    programme: f.programme,
    quote: f.quote,
    photo: f.photo,
    display_order: nextOrder,
    is_published: f.is_published,
    created_by: user.id,
  });
  if (error) {
    console.error('[testimonials] createTestimonial failed', error);
    return { error: SAVE_FAILED };
  }

  revalidatePublic();
  redirect('/admin/testimonials');
}

export async function updateTestimonial(
  testimonialId: string,
  _prev: TestimonialFormState,
  formData: FormData,
): Promise<TestimonialFormState> {
  const { supabase } = await requireActiveAdmin();

  const parsed = readTestimonialForm(formData);
  if ('error' in parsed) return { error: parsed.error };
  const f = parsed.value;

  // display_order is not part of the form — it is owned by the reorder controls.
  const { error } = await supabase
    .from('testimonials')
    .update({
      student_name: f.student_name,
      programme: f.programme,
      quote: f.quote,
      photo: f.photo,
      is_published: f.is_published,
    })
    .eq('id', testimonialId);
  if (error) {
    console.error('[testimonials] updateTestimonial failed', error);
    return { error: SAVE_FAILED };
  }

  revalidatePublic();
  redirect('/admin/testimonials');
}

export async function togglePublish(formData: FormData): Promise<void> {
  const { supabase } = await requireActiveAdmin();

  const id = String(formData.get('id') ?? '');
  const publish = String(formData.get('publish') ?? '') === 'true';
  if (!id) return;

  const { error } = await supabase
    .from('testimonials')
    .update({ is_published: publish })
    .eq('id', id);
  if (error) {
    console.error('[testimonials] togglePublish failed', error);
    return;
  }

  revalidatePublic();
  revalidatePath('/admin/testimonials');
}

export async function deleteTestimonial(formData: FormData): Promise<void> {
  const { supabase } = await requireActiveAdmin();

  const id = String(formData.get('id') ?? '');
  if (!id) return;

  const { error } = await supabase.from('testimonials').delete().eq('id', id);
  if (error) {
    console.error('[testimonials] deleteTestimonial failed', error);
    return;
  }

  revalidatePublic();
  revalidatePath('/admin/testimonials');
}

// Reorder by swapping display_order with the neighbour, the same approach as
// moveAchievement.
export async function moveTestimonial(formData: FormData): Promise<void> {
  const { supabase } = await requireActiveAdmin();

  const id = String(formData.get('id') ?? '');
  const direction = String(formData.get('direction') ?? '');
  if (!id || (direction !== 'up' && direction !== 'down')) return;

  const { data: rows } = await supabase
    .from('testimonials')
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
    .from('testimonials')
    .update({ display_order: b.display_order })
    .eq('id', a.id);
  await supabase
    .from('testimonials')
    .update({ display_order: a.display_order })
    .eq('id', b.id);

  revalidatePublic();
  revalidatePath('/admin/testimonials');
}
