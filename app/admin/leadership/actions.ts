'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireActiveAdmin } from '@/lib/auth-guard';

export type LeadershipFormState = { error: string | null };

// Generic message for DB failures. Raw Postgres text (e.g. "violates row-level
// security policy") is logged server-side, never surfaced to the browser.
const SAVE_FAILED =
  'Something went wrong saving this message. Please try again.';

// Leadership messages appear in ONE place: the homepage. There is no dedicated
// public route to revalidate (unlike testimonials → /students-voice), so '/' is
// the entire public refresh surface. The admin list is revalidated alongside it
// so a change shows without a hard reload.
function revalidatePublic() {
  revalidatePath('/');
}

type LeadershipFields = {
  name: string;
  title: string;
  photo: string | null;
  excerpt: string;
  full_message: string | null;
  is_published: boolean;
};

function readLeadershipForm(
  formData: FormData,
): { value: LeadershipFields } | { error: string } {
  const name = String(formData.get('name') ?? '').trim();
  if (!name) return { error: 'A name is required.' };

  const title = String(formData.get('title') ?? '').trim();
  if (!title) return { error: 'A title is required.' };

  const excerpt = String(formData.get('excerpt') ?? '').trim();
  if (!excerpt) return { error: 'A short statement is required.' };

  const photo = String(formData.get('photo') ?? '').trim();
  // An empty full message is stored as NULL, not '': the public card decides
  // whether to render its "Read full message" button from this column, and a
  // whitespace-only string must read as "nothing to expand to", same as null.
  const fullMessage = String(formData.get('full_message') ?? '').trim();

  return {
    value: {
      name,
      title,
      photo: photo || null,
      excerpt,
      full_message: fullMessage || null,
      is_published: formData.get('is_published') === 'on',
    },
  };
}

export async function createLeadershipMessage(
  _prev: LeadershipFormState,
  formData: FormData,
): Promise<LeadershipFormState> {
  const { supabase, user } = await requireActiveAdmin();

  const parsed = readLeadershipForm(formData);
  if ('error' in parsed) return { error: parsed.error };
  const f = parsed.value;

  // New messages land at the end of the editor-controlled order.
  const { data: last } = await supabase
    .from('leadership_messages')
    .select('display_order')
    .order('display_order', { ascending: false })
    .limit(1);
  const nextOrder = (last?.[0]?.display_order ?? 0) + 1;

  const { error } = await supabase.from('leadership_messages').insert({
    name: f.name,
    title: f.title,
    photo: f.photo,
    excerpt: f.excerpt,
    full_message: f.full_message,
    display_order: nextOrder,
    is_published: f.is_published,
    created_by: user.id,
  });
  if (error) {
    console.error('[leadership] createLeadershipMessage failed', error);
    return { error: SAVE_FAILED };
  }

  revalidatePublic();
  redirect('/admin/leadership');
}

export async function updateLeadershipMessage(
  messageId: string,
  _prev: LeadershipFormState,
  formData: FormData,
): Promise<LeadershipFormState> {
  const { supabase } = await requireActiveAdmin();

  const parsed = readLeadershipForm(formData);
  if ('error' in parsed) return { error: parsed.error };
  const f = parsed.value;

  // display_order is not part of the form — it is owned by the reorder controls.
  const { error } = await supabase
    .from('leadership_messages')
    .update({
      name: f.name,
      title: f.title,
      photo: f.photo,
      excerpt: f.excerpt,
      full_message: f.full_message,
      is_published: f.is_published,
    })
    .eq('id', messageId);
  if (error) {
    console.error('[leadership] updateLeadershipMessage failed', error);
    return { error: SAVE_FAILED };
  }

  revalidatePublic();
  redirect('/admin/leadership');
}

export async function togglePublish(formData: FormData): Promise<void> {
  const { supabase } = await requireActiveAdmin();

  const id = String(formData.get('id') ?? '');
  const publish = String(formData.get('publish') ?? '') === 'true';
  if (!id) return;

  const { error } = await supabase
    .from('leadership_messages')
    .update({ is_published: publish })
    .eq('id', id);
  if (error) {
    console.error('[leadership] togglePublish failed', error);
    return;
  }

  revalidatePublic();
  revalidatePath('/admin/leadership');
}

export async function deleteLeadershipMessage(formData: FormData): Promise<void> {
  const { supabase } = await requireActiveAdmin();

  const id = String(formData.get('id') ?? '');
  if (!id) return;

  const { error } = await supabase
    .from('leadership_messages')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('[leadership] deleteLeadershipMessage failed', error);
    return;
  }

  revalidatePublic();
  revalidatePath('/admin/leadership');
}

// Reorder by swapping display_order with the neighbour, the same approach as
// moveTestimonial.
export async function moveLeadershipMessage(formData: FormData): Promise<void> {
  const { supabase } = await requireActiveAdmin();

  const id = String(formData.get('id') ?? '');
  const direction = String(formData.get('direction') ?? '');
  if (!id || (direction !== 'up' && direction !== 'down')) return;

  const { data: rows } = await supabase
    .from('leadership_messages')
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
    .from('leadership_messages')
    .update({ display_order: b.display_order })
    .eq('id', a.id);
  await supabase
    .from('leadership_messages')
    .update({ display_order: a.display_order })
    .eq('id', b.id);

  revalidatePublic();
  revalidatePath('/admin/leadership');
}
