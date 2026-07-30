'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireActiveAdmin } from '@/lib/auth-guard';
import { POST_TYPES, slugify, type PostType } from '@/lib/news';

// Generic message for DB failures. Raw Postgres text (e.g. "violates row-level
// security policy") is logged server-side, never surfaced to the browser.
const SAVE_FAILED = 'Something went wrong saving this post. Please try again.';

export type PostFormState = { error: string | null };

// Refresh every public surface a post can appear on (PRD 10.5). Admin pages
// render fresh per request and need no revalidation.
function revalidatePublic(slug?: string | null) {
  revalidatePath('/news');
  revalidatePath('/'); // homepage News teaser
  if (slug) revalidatePath(`/news/${slug}`);
}

// A unique slug: start from the requested one, then append -2, -3, … on clash.
async function uniqueSlug(
  supabase: SupabaseClient,
  base: string,
  excludeId?: string,
): Promise<string> {
  const root = base || 'post';
  let candidate = root;
  let n = 1;
  // Small data set; a short loop is fine.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data } = await supabase
      .from('posts')
      .select('id')
      .eq('slug', candidate)
      .limit(1);
    const clash = data?.[0] && data[0].id !== excludeId;
    if (!clash) return candidate;
    n += 1;
    candidate = `${root}-${n}`;
  }
}

type PostFields = {
  title: string;
  slugInput: string;
  type: PostType;
  excerpt: string | null;
  body: string | null;
  cover_image: string | null;
  category_id: string | null;
  is_published: boolean;
};

function readPostForm(
  formData: FormData,
): { value: PostFields } | { error: string } {
  const title = String(formData.get('title') ?? '').trim();
  if (!title) return { error: 'A title is required.' };

  const type = String(formData.get('type') ?? 'news') as PostType;
  if (!POST_TYPES.includes(type)) return { error: 'Choose a valid type.' };

  const rawCategory = String(formData.get('category_id') ?? '').trim();
  const rawCover = String(formData.get('cover_image') ?? '').trim();
  const excerpt = String(formData.get('excerpt') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();

  return {
    value: {
      title,
      slugInput: slugify(String(formData.get('slug') ?? '') || title),
      type,
      excerpt: excerpt || null,
      body: body || null,
      cover_image: rawCover || null,
      category_id: rawCategory || null,
      is_published: formData.get('is_published') === 'on',
    },
  };
}

export async function createPost(
  _prev: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  const { supabase, user } = await requireActiveAdmin();

  const parsed = readPostForm(formData);
  if ('error' in parsed) return { error: parsed.error };
  const f = parsed.value;

  const slug = await uniqueSlug(supabase, f.slugInput);
  const { error } = await supabase.from('posts').insert({
    title: f.title,
    slug,
    type: f.type,
    excerpt: f.excerpt,
    body: f.body,
    cover_image: f.cover_image,
    category_id: f.category_id,
    is_published: f.is_published,
    published_at: f.is_published ? new Date().toISOString() : null,
    created_by: user.id,
  });
  if (error) {
    console.error('[news] createPost failed', error);
    return { error: SAVE_FAILED };
  }

  revalidatePublic(slug);
  redirect('/admin/news');
}

export async function updatePost(
  postId: string,
  _prev: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  const { supabase } = await requireActiveAdmin();

  const parsed = readPostForm(formData);
  if ('error' in parsed) return { error: parsed.error };
  const f = parsed.value;

  const { data: existing } = await supabase
    .from('posts')
    .select('published_at, slug')
    .eq('id', postId)
    .single();

  const slug = await uniqueSlug(supabase, f.slugInput, postId);
  // Set published_at the first time it goes live; keep it afterward.
  const published_at = f.is_published
    ? (existing?.published_at ?? new Date().toISOString())
    : (existing?.published_at ?? null);

  const { error } = await supabase
    .from('posts')
    .update({
      title: f.title,
      slug,
      type: f.type,
      excerpt: f.excerpt,
      body: f.body,
      cover_image: f.cover_image,
      category_id: f.category_id,
      is_published: f.is_published,
      published_at,
    })
    .eq('id', postId);
  if (error) {
    console.error('[news] updatePost failed', error);
    return { error: SAVE_FAILED };
  }

  revalidatePublic(slug);
  if (existing?.slug && existing.slug !== slug) revalidatePublic(existing.slug);
  redirect('/admin/news');
}

export async function togglePublish(formData: FormData): Promise<void> {
  const { supabase } = await requireActiveAdmin();

  const id = String(formData.get('id') ?? '');
  const publish = String(formData.get('publish') ?? '') === 'true';
  if (!id) return;

  const { data: existing } = await supabase
    .from('posts')
    .select('published_at, slug')
    .eq('id', id)
    .single();

  const published_at = publish
    ? (existing?.published_at ?? new Date().toISOString())
    : (existing?.published_at ?? null);

  const { error } = await supabase
    .from('posts')
    .update({ is_published: publish, published_at })
    .eq('id', id);
  if (error) return;

  revalidatePublic(existing?.slug);
  revalidatePath('/admin/news');
}

export async function deletePost(formData: FormData): Promise<void> {
  const { supabase } = await requireActiveAdmin();

  const id = String(formData.get('id') ?? '');
  if (!id) return;

  const { data: existing } = await supabase
    .from('posts')
    .select('slug')
    .eq('id', id)
    .single();

  const { error } = await supabase.from('posts').delete().eq('id', id);
  if (error) return;

  revalidatePublic(existing?.slug);
  revalidatePath('/admin/news');
}

// ---- Categories ------------------------------------------------------------

export async function createCategory(formData: FormData): Promise<void> {
  const { supabase } = await requireActiveAdmin();

  const name = String(formData.get('name') ?? '').trim();
  if (!name) return;

  const { data: last } = await supabase
    .from('news_categories')
    .select('display_order')
    .order('display_order', { ascending: false })
    .limit(1);
  const nextOrder = (last?.[0]?.display_order ?? 0) + 1;

  await supabase.from('news_categories').insert({ name, display_order: nextOrder });
  revalidatePath('/admin/news');
  revalidatePath('/news');
}

export async function renameCategory(formData: FormData): Promise<void> {
  const { supabase } = await requireActiveAdmin();

  const id = String(formData.get('id') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  if (!id || !name) return;

  await supabase.from('news_categories').update({ name }).eq('id', id);
  revalidatePath('/admin/news');
  revalidatePath('/news');
}

export async function deleteCategory(formData: FormData): Promise<void> {
  const { supabase } = await requireActiveAdmin();

  const id = String(formData.get('id') ?? '');
  if (!id) return;

  // posts.category_id is ON DELETE SET NULL, so posts survive un-categorised.
  await supabase.from('news_categories').delete().eq('id', id);
  revalidatePath('/admin/news');
  revalidatePath('/news');
}

export async function moveCategory(formData: FormData): Promise<void> {
  const { supabase } = await requireActiveAdmin();

  const id = String(formData.get('id') ?? '');
  const direction = String(formData.get('direction') ?? '');
  if (!id || (direction !== 'up' && direction !== 'down')) return;

  const { data: cats } = await supabase
    .from('news_categories')
    .select('id, display_order')
    .order('display_order', { ascending: true });
  if (!cats) return;

  const index = cats.findIndex((c) => c.id === id);
  const swapWith = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= cats.length) return;

  const a = cats[index];
  const b = cats[swapWith];
  // Swap their display_order values.
  await supabase
    .from('news_categories')
    .update({ display_order: b.display_order })
    .eq('id', a.id);
  await supabase
    .from('news_categories')
    .update({ display_order: a.display_order })
    .eq('id', b.id);

  revalidatePath('/admin/news');
  revalidatePath('/news');
}
