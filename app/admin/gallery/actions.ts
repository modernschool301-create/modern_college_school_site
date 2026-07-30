'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireActiveAdmin } from '@/lib/auth-guard';
import { slugifyAlbum } from '@/lib/gallery';

export type AlbumFormState = { error: string | null };
export type PhotoFormState = { error: string | null };

// Generic messages for DB failures. Raw Postgres text (e.g. "violates row-level
// security policy") is logged server-side, never surfaced to the browser.
const SAVE_FAILED = 'Something went wrong saving this album. Please try again.';
const PHOTO_FAILED = 'Something went wrong saving this photo. Please try again.';

// Refresh every public surface an album can appear on (PRD 10.5). The detail
// page is per-slug, so it is only revalidated when the slug is known.
function revalidatePublic(slug?: string | null) {
  revalidatePath('/gallery');
  if (slug) revalidatePath(`/gallery/${slug}`);
}

function revalidateAdmin(albumId?: string) {
  revalidatePath('/admin/gallery');
  if (albumId) revalidatePath(`/admin/gallery/${albumId}/edit`);
}

// A unique slug: start from the requested one, then append -2, -3, … on clash.
// Mirrors the News helper; the tables are different, so the query is too.
async function uniqueSlug(
  supabase: SupabaseClient,
  base: string,
  excludeId?: string,
): Promise<string> {
  const root = base || 'album';
  let candidate = root;
  let n = 1;
  // Small data set; a short loop is fine.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data } = await supabase
      .from('gallery_albums')
      .select('id')
      .eq('slug', candidate)
      .limit(1);
    const clash = data?.[0] && data[0].id !== excludeId;
    if (!clash) return candidate;
    n += 1;
    candidate = `${root}-${n}`;
  }
}

// The slug of the album a photo belongs to, so photo actions can revalidate the
// public detail page they affect.
async function albumSlugById(
  supabase: SupabaseClient,
  albumId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('gallery_albums')
    .select('slug')
    .eq('id', albumId)
    .single();
  return (data?.slug as string) ?? null;
}


// ---------------------------------------------------------------------------
// Albums
// ---------------------------------------------------------------------------

type AlbumFields = {
  title: string;
  slugInput: string;
  cover_photo: string | null;
  event_date: string | null;
  is_published: boolean;
};

function readAlbumForm(
  formData: FormData,
): { value: AlbumFields } | { error: string } {
  const title = String(formData.get('title') ?? '').trim();
  if (!title) return { error: 'A title is required.' };

  const cover = String(formData.get('cover_photo') ?? '').trim();
  const eventDate = String(formData.get('event_date') ?? '').trim();

  return {
    value: {
      title,
      slugInput: slugifyAlbum(String(formData.get('slug') ?? '') || title),
      cover_photo: cover || null,
      // An empty date input posts '' — the column is a nullable DATE, so it must
      // become null, never an empty string.
      event_date: eventDate || null,
      is_published: formData.get('is_published') === 'on',
    },
  };
}

export async function createAlbum(
  _prev: AlbumFormState,
  formData: FormData,
): Promise<AlbumFormState> {
  const { supabase, user } = await requireActiveAdmin();

  const parsed = readAlbumForm(formData);
  if ('error' in parsed) return { error: parsed.error };
  const f = parsed.value;

  // New albums land at the end of the editor-controlled order.
  const { data: last } = await supabase
    .from('gallery_albums')
    .select('display_order')
    .order('display_order', { ascending: false })
    .limit(1);
  const nextOrder = (last?.[0]?.display_order ?? 0) + 1;

  const slug = await uniqueSlug(supabase, f.slugInput);
  const { data: created, error } = await supabase
    .from('gallery_albums')
    .insert({
      slug,
      title: f.title,
      cover_photo: f.cover_photo,
      event_date: f.event_date,
      display_order: nextOrder,
      is_published: f.is_published,
      created_by: user.id,
    })
    .select('id')
    .single();
  if (error || !created) {
    console.error('[gallery] createAlbum failed', error);
    return { error: SAVE_FAILED };
  }

  revalidatePublic(slug);
  // Straight to the edit screen: a new album has no photographs yet, and adding
  // them is the obvious next step.
  redirect(`/admin/gallery/${created.id}/edit`);
}

export async function updateAlbum(
  albumId: string,
  _prev: AlbumFormState,
  formData: FormData,
): Promise<AlbumFormState> {
  const { supabase } = await requireActiveAdmin();

  const parsed = readAlbumForm(formData);
  if ('error' in parsed) return { error: parsed.error };
  const f = parsed.value;

  const { data: existing } = await supabase
    .from('gallery_albums')
    .select('slug')
    .eq('id', albumId)
    .single();

  const slug = await uniqueSlug(supabase, f.slugInput, albumId);

  // display_order is not part of the form — it is owned by the reorder controls.
  const { error } = await supabase
    .from('gallery_albums')
    .update({
      slug,
      title: f.title,
      cover_photo: f.cover_photo,
      event_date: f.event_date,
      is_published: f.is_published,
    })
    .eq('id', albumId);
  if (error) {
    console.error('[gallery] updateAlbum failed', error);
    return { error: SAVE_FAILED };
  }

  revalidatePublic(slug);
  // A renamed album leaves its old address behind; refresh that too so the stale
  // page does not keep serving.
  if (existing?.slug && existing.slug !== slug) revalidatePublic(existing.slug);
  redirect('/admin/gallery');
}

export async function toggleAlbumPublish(formData: FormData): Promise<void> {
  const { supabase } = await requireActiveAdmin();

  const id = String(formData.get('id') ?? '');
  const publish = String(formData.get('publish') ?? '') === 'true';
  if (!id) return;

  const { data, error } = await supabase
    .from('gallery_albums')
    .update({ is_published: publish })
    .eq('id', id)
    .select('slug')
    .single();
  if (error) {
    console.error('[gallery] toggleAlbumPublish failed', error);
    return;
  }

  revalidatePublic(data?.slug);
  revalidateAdmin();
}

export async function deleteAlbum(formData: FormData): Promise<void> {
  const { supabase } = await requireActiveAdmin();

  const id = String(formData.get('id') ?? '');
  if (!id) return;

  const slug = await albumSlugById(supabase, id);

  // The photo ROWS go with it via ON DELETE CASCADE. The Cloudinary assets do
  // NOT — they are left to the monthly orphan reconciliation (PRD 10.3), the
  // project-wide pattern.
  const { error } = await supabase.from('gallery_albums').delete().eq('id', id);
  if (error) {
    console.error('[gallery] deleteAlbum failed', error);
    return;
  }

  revalidatePublic(slug);
  revalidateAdmin();
}

export async function moveAlbum(formData: FormData): Promise<void> {
  const { supabase } = await requireActiveAdmin();

  const id = String(formData.get('id') ?? '');
  const direction = String(formData.get('direction') ?? '');
  if (!id || (direction !== 'up' && direction !== 'down')) return;

  const { data: rows } = await supabase
    .from('gallery_albums')
    .select('id, display_order')
    .order('display_order', { ascending: true });
  if (!rows) return;

  const index = rows.findIndex((r) => r.id === id);
  const swapWith = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= rows.length) return;

  const a = rows[index];
  const b = rows[swapWith];
  await supabase
    .from('gallery_albums')
    .update({ display_order: b.display_order })
    .eq('id', a.id);
  await supabase
    .from('gallery_albums')
    .update({ display_order: a.display_order })
    .eq('id', b.id);

  revalidatePublic();
  revalidateAdmin();
}


// ---------------------------------------------------------------------------
// Photos — always scoped to one album, managed from that album's edit screen
// ---------------------------------------------------------------------------

export async function addPhoto(
  albumId: string,
  _prev: PhotoFormState,
  formData: FormData,
): Promise<PhotoFormState> {
  const { supabase } = await requireActiveAdmin();

  const photoFile = String(formData.get('photo_file') ?? '').trim();
  if (!photoFile) return { error: 'Please upload a photograph first.' };
  const caption = String(formData.get('caption') ?? '').trim();

  // New photos land at the end of THIS album's order — the max is scoped to the
  // album, not global, or every album after the first would start high.
  const { data: last } = await supabase
    .from('gallery_photos')
    .select('display_order')
    .eq('album_id', albumId)
    .order('display_order', { ascending: false })
    .limit(1);
  const nextOrder = (last?.[0]?.display_order ?? 0) + 1;

  const { error } = await supabase.from('gallery_photos').insert({
    album_id: albumId,
    photo_file: photoFile,
    caption: caption || null,
    display_order: nextOrder,
  });
  if (error) {
    console.error('[gallery] addPhoto failed', error);
    return { error: PHOTO_FAILED };
  }

  revalidatePublic(await albumSlugById(supabase, albumId));
  revalidateAdmin(albumId);
  return { error: null };
}

export async function updatePhotoCaption(formData: FormData): Promise<void> {
  const { supabase } = await requireActiveAdmin();

  const id = String(formData.get('id') ?? '');
  const albumId = String(formData.get('album_id') ?? '');
  if (!id) return;
  const caption = String(formData.get('caption') ?? '').trim();

  const { error } = await supabase
    .from('gallery_photos')
    .update({ caption: caption || null })
    .eq('id', id);
  if (error) {
    console.error('[gallery] updatePhotoCaption failed', error);
    return;
  }

  revalidatePublic(await albumSlugById(supabase, albumId));
  revalidateAdmin(albumId);
}

export async function deletePhoto(formData: FormData): Promise<void> {
  const { supabase } = await requireActiveAdmin();

  const id = String(formData.get('id') ?? '');
  const albumId = String(formData.get('album_id') ?? '');
  if (!id) return;

  // Row only; the Cloudinary asset is left to the orphan sweep (PRD 10.3).
  const { error } = await supabase.from('gallery_photos').delete().eq('id', id);
  if (error) {
    console.error('[gallery] deletePhoto failed', error);
    return;
  }

  revalidatePublic(await albumSlugById(supabase, albumId));
  revalidateAdmin(albumId);
}

// Reorder WITHIN one album: the neighbour list is filtered by album_id, so a
// photo can never swap order with a photo in a different album.
export async function movePhoto(formData: FormData): Promise<void> {
  const { supabase } = await requireActiveAdmin();

  const id = String(formData.get('id') ?? '');
  const albumId = String(formData.get('album_id') ?? '');
  const direction = String(formData.get('direction') ?? '');
  if (!id || !albumId || (direction !== 'up' && direction !== 'down')) return;

  const { data: rows } = await supabase
    .from('gallery_photos')
    .select('id, display_order')
    .eq('album_id', albumId)
    .order('display_order', { ascending: true });
  if (!rows) return;

  const index = rows.findIndex((r) => r.id === id);
  const swapWith = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= rows.length) return;

  const a = rows[index];
  const b = rows[swapWith];
  await supabase
    .from('gallery_photos')
    .update({ display_order: b.display_order })
    .eq('id', a.id);
  await supabase
    .from('gallery_photos')
    .update({ display_order: a.display_order })
    .eq('id', b.id);

  revalidatePublic(await albumSlugById(supabase, albumId));
  revalidateAdmin(albumId);
}
