'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireActiveAdmin } from '@/lib/auth-guard';
import {
  DOWNLOAD_CATEGORIES,
  type DownloadCategory,
} from '@/lib/downloads';

export type DownloadFormState = { error: string | null };

// Generic message for DB failures. Raw Postgres text (e.g. "violates row-level
// security policy") is logged server-side, never surfaced to the browser.
const SAVE_FAILED =
  'Something went wrong saving this download. Please try again.';

// The public Downloads page (PRD 23) is the whole public refresh surface; the
// admin list also revalidates so a change shows without a hard reload.
function revalidatePublic() {
  revalidatePath('/downloads');
}

type DownloadFields = {
  title: string;
  description: string | null;
  file: string;
  category: DownloadCategory;
  is_published: boolean;
};

function readDownloadForm(
  formData: FormData,
): { value: DownloadFields } | { error: string } {
  const title = String(formData.get('title') ?? '').trim();
  if (!title) return { error: 'A title is required.' };

  // The file is REQUIRED here, unlike the optional cover images elsewhere: a
  // downloads row with no file is a dead link on the public page. The column is
  // NOT NULL, so this check is the friendly message in front of that constraint.
  const file = String(formData.get('file') ?? '').trim();
  if (!file) return { error: 'Please upload a file.' };

  // The category arrives from a <select>, but it is still validated against the
  // known vocabulary — the browser is never trusted, and an unknown value would
  // be rejected by the enum with a raw Postgres error instead of this message.
  const categoryRaw = String(formData.get('category') ?? '');
  if (!DOWNLOAD_CATEGORIES.includes(categoryRaw as DownloadCategory)) {
    return { error: 'Please choose a category.' };
  }

  const description = String(formData.get('description') ?? '').trim();

  return {
    value: {
      title,
      description: description || null,
      file,
      category: categoryRaw as DownloadCategory,
      is_published: formData.get('is_published') === 'on',
    },
  };
}

export async function createDownload(
  _prev: DownloadFormState,
  formData: FormData,
): Promise<DownloadFormState> {
  const { supabase, user } = await requireActiveAdmin();

  const parsed = readDownloadForm(formData);
  if ('error' in parsed) return { error: parsed.error };
  const f = parsed.value;

  // New downloads land at the end of the editor-controlled order.
  const { data: last } = await supabase
    .from('downloads')
    .select('display_order')
    .order('display_order', { ascending: false })
    .limit(1);
  const nextOrder = (last?.[0]?.display_order ?? 0) + 1;

  const { error } = await supabase.from('downloads').insert({
    title: f.title,
    description: f.description,
    file: f.file,
    category: f.category,
    display_order: nextOrder,
    is_published: f.is_published,
    published_at: f.is_published ? new Date().toISOString() : null,
    created_by: user.id,
  });
  if (error) {
    console.error('[downloads] createDownload failed', error);
    return { error: SAVE_FAILED };
  }

  revalidatePublic();
  redirect('/admin/downloads');
}

export async function updateDownload(
  downloadId: string,
  _prev: DownloadFormState,
  formData: FormData,
): Promise<DownloadFormState> {
  const { supabase } = await requireActiveAdmin();

  const parsed = readDownloadForm(formData);
  if ('error' in parsed) return { error: parsed.error };
  const f = parsed.value;

  const { data: existing } = await supabase
    .from('downloads')
    .select('published_at')
    .eq('id', downloadId)
    .single();

  // Set published_at the first time it goes live; keep it afterward (the same
  // rule as posts).
  const published_at = f.is_published
    ? (existing?.published_at ?? new Date().toISOString())
    : (existing?.published_at ?? null);

  // display_order is not part of the form — it is owned by the reorder controls.
  const { error } = await supabase
    .from('downloads')
    .update({
      title: f.title,
      description: f.description,
      file: f.file,
      category: f.category,
      is_published: f.is_published,
      published_at,
    })
    .eq('id', downloadId);
  if (error) {
    console.error('[downloads] updateDownload failed', error);
    return { error: SAVE_FAILED };
  }

  revalidatePublic();
  redirect('/admin/downloads');
}

export async function togglePublish(formData: FormData): Promise<void> {
  const { supabase } = await requireActiveAdmin();

  const id = String(formData.get('id') ?? '');
  const publish = String(formData.get('publish') ?? '') === 'true';
  if (!id) return;

  const { data: existing } = await supabase
    .from('downloads')
    .select('published_at')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('downloads')
    .update({
      is_published: publish,
      published_at: publish
        ? (existing?.published_at ?? new Date().toISOString())
        : (existing?.published_at ?? null),
    })
    .eq('id', id);
  if (error) {
    console.error('[downloads] togglePublish failed', error);
    return;
  }

  revalidatePublic();
  revalidatePath('/admin/downloads');
}

export async function deleteDownload(formData: FormData): Promise<void> {
  const { supabase } = await requireActiveAdmin();

  const id = String(formData.get('id') ?? '');
  if (!id) return;

  // Only the row goes; the Cloudinary asset is left for the monthly orphan
  // reconciliation (PRD 10.3), which is the project-wide pattern — no module
  // deletes remote media inline.
  const { error } = await supabase.from('downloads').delete().eq('id', id);
  if (error) {
    console.error('[downloads] deleteDownload failed', error);
    return;
  }

  revalidatePublic();
  revalidatePath('/admin/downloads');
}

// Reorder by swapping display_order with the neighbour, the same approach as
// moveScholarship.
export async function moveDownload(formData: FormData): Promise<void> {
  const { supabase } = await requireActiveAdmin();

  const id = String(formData.get('id') ?? '');
  const direction = String(formData.get('direction') ?? '');
  if (!id || (direction !== 'up' && direction !== 'down')) return;

  const { data: rows } = await supabase
    .from('downloads')
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
    .from('downloads')
    .update({ display_order: b.display_order })
    .eq('id', a.id);
  await supabase
    .from('downloads')
    .update({ display_order: a.display_order })
    .eq('id', b.id);

  revalidatePublic();
  revalidatePath('/admin/downloads');
}
