'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireActiveAdmin } from '@/lib/auth-guard';
import {
  PROGRAMME_LEVELS,
  slugifyProgramme,
  type ProgrammeLevel,
} from '@/lib/programmes';

export type ProgrammeFormState = { error: string | null };
export type FacultyFormState = { error: string | null };

// Generic messages for DB failures. Raw Postgres text (e.g. "violates row-level
// security policy") is logged server-side, never surfaced to the browser.
const SAVE_FAILED = 'Something went wrong saving this programme. Please try again.';
const FACULTY_FAILED =
  'Something went wrong saving this faculty member. Please try again.';

// Refresh every public surface a programme can appear on (PRD 10.5). The detail
// page is per-slug, so it is only revalidated when the slug is known.
//
// NOT revalidated: the homepage programmes-overview section, which is still
// hardcoded — when it starts reading this table it must be added here.
function revalidatePublic(slug?: string | null) {
  revalidatePath('/programmes');
  if (slug) revalidatePath(`/programmes/${slug}`);
}

function revalidateAdmin(programmeId?: string) {
  revalidatePath('/admin/programmes');
  if (programmeId) revalidatePath(`/admin/programmes/${programmeId}/edit`);
}

// A unique slug: start from the requested one, then append -2, -3, … on clash.
// Mirrors the News and Gallery helpers; the tables differ, so the query does.
async function uniqueSlug(
  supabase: SupabaseClient,
  base: string,
  excludeId?: string,
): Promise<string> {
  const root = base || 'programme';
  let candidate = root;
  let n = 1;
  // Small data set; a short loop is fine.
  while (true) {
    const { data } = await supabase
      .from('programmes')
      .select('id')
      .eq('slug', candidate)
      .limit(1);
    const clash = data?.[0] && data[0].id !== excludeId;
    if (!clash) return candidate;
    n += 1;
    candidate = `${root}-${n}`;
  }
}

// The slug of the programme a faculty row belongs to, so faculty actions can
// revalidate the public detail page they affect.
async function programmeSlugById(
  supabase: SupabaseClient,
  programmeId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('programmes')
    .select('slug')
    .eq('id', programmeId)
    .single();
  return (data?.slug as string) ?? null;
}


// ---------------------------------------------------------------------------
// Programmes
// ---------------------------------------------------------------------------

type ProgrammeFields = {
  title: string;
  slugInput: string;
  level: ProgrammeLevel;
  intro: string | null;
  body: string | null;
  cover_image: string | null;
  is_published: boolean;
};

function readProgrammeForm(
  formData: FormData,
): { value: ProgrammeFields } | { error: string } {
  const title = String(formData.get('title') ?? '').trim();
  if (!title) return { error: 'A title is required.' };

  // The level arrives as a string from a <select>. It is validated against the
  // known vocabulary here rather than trusted — a value outside the enum would
  // otherwise reach Postgres as a type error, which surfaces as the generic
  // save-failed message and tells the admin nothing useful.
  const rawLevel = String(formData.get('level') ?? '');
  if (!PROGRAMME_LEVELS.includes(rawLevel as ProgrammeLevel)) {
    return { error: 'Please choose a level.' };
  }

  const intro = String(formData.get('intro') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();
  const cover = String(formData.get('cover_image') ?? '').trim();

  return {
    value: {
      title,
      slugInput: slugifyProgramme(String(formData.get('slug') ?? '') || title),
      level: rawLevel as ProgrammeLevel,
      intro: intro || null,
      body: body || null,
      cover_image: cover || null,
      is_published: formData.get('is_published') === 'on',
    },
  };
}

export async function createProgramme(
  _prev: ProgrammeFormState,
  formData: FormData,
): Promise<ProgrammeFormState> {
  const { supabase, user } = await requireActiveAdmin();

  const parsed = readProgrammeForm(formData);
  if ('error' in parsed) return { error: parsed.error };
  const f = parsed.value;

  // New programmes land at the end of the editor-controlled order.
  const { data: last } = await supabase
    .from('programmes')
    .select('display_order')
    .order('display_order', { ascending: false })
    .limit(1);
  const nextOrder = (last?.[0]?.display_order ?? 0) + 1;

  const slug = await uniqueSlug(supabase, f.slugInput);
  const { data: created, error } = await supabase
    .from('programmes')
    .insert({
      slug,
      title: f.title,
      level: f.level,
      intro: f.intro,
      body: f.body,
      cover_image: f.cover_image,
      display_order: nextOrder,
      is_published: f.is_published,
      created_by: user.id,
    })
    .select('id')
    .single();
  if (error || !created) {
    console.error('[programmes] createProgramme failed', error);
    return { error: SAVE_FAILED };
  }

  revalidatePublic(slug);
  // Straight to the edit screen, as Gallery does: a new programme has no
  // faculty rows yet, and adding them is the obvious next step.
  redirect(`/admin/programmes/${created.id}/edit`);
}

export async function updateProgramme(
  programmeId: string,
  _prev: ProgrammeFormState,
  formData: FormData,
): Promise<ProgrammeFormState> {
  const { supabase } = await requireActiveAdmin();

  const parsed = readProgrammeForm(formData);
  if ('error' in parsed) return { error: parsed.error };
  const f = parsed.value;

  const { data: existing } = await supabase
    .from('programmes')
    .select('slug')
    .eq('id', programmeId)
    .single();

  const slug = await uniqueSlug(supabase, f.slugInput, programmeId);

  // display_order is not part of the form — it is owned by the reorder controls.
  const { error } = await supabase
    .from('programmes')
    .update({
      slug,
      title: f.title,
      level: f.level,
      intro: f.intro,
      body: f.body,
      cover_image: f.cover_image,
      is_published: f.is_published,
    })
    .eq('id', programmeId);
  if (error) {
    console.error('[programmes] updateProgramme failed', error);
    return { error: SAVE_FAILED };
  }

  revalidatePublic(slug);
  // A renamed programme leaves its old address behind; refresh that too so the
  // stale page does not keep serving.
  if (existing?.slug && existing.slug !== slug) revalidatePublic(existing.slug);
  redirect('/admin/programmes');
}

export async function toggleProgrammePublish(formData: FormData): Promise<void> {
  const { supabase } = await requireActiveAdmin();

  const id = String(formData.get('id') ?? '');
  const publish = String(formData.get('publish') ?? '') === 'true';
  if (!id) return;

  const { data, error } = await supabase
    .from('programmes')
    .update({ is_published: publish })
    .eq('id', id)
    .select('slug')
    .single();
  if (error) {
    console.error('[programmes] toggleProgrammePublish failed', error);
    return;
  }

  revalidatePublic(data?.slug);
  revalidateAdmin();
}

export async function deleteProgramme(formData: FormData): Promise<void> {
  const { supabase } = await requireActiveAdmin();

  const id = String(formData.get('id') ?? '');
  if (!id) return;

  const slug = await programmeSlugById(supabase, id);

  // The faculty ROWS go with it via ON DELETE CASCADE. The Cloudinary assets do
  // NOT — they are left to the monthly orphan reconciliation (PRD 10.3), the
  // project-wide pattern.
  const { error } = await supabase.from('programmes').delete().eq('id', id);
  if (error) {
    console.error('[programmes] deleteProgramme failed', error);
    return;
  }

  revalidatePublic(slug);
  revalidateAdmin();
}

export async function moveProgramme(formData: FormData): Promise<void> {
  const { supabase } = await requireActiveAdmin();

  const id = String(formData.get('id') ?? '');
  const direction = String(formData.get('direction') ?? '');
  if (!id || (direction !== 'up' && direction !== 'down')) return;

  const { data: rows } = await supabase
    .from('programmes')
    .select('id, display_order')
    .order('display_order', { ascending: true });
  if (!rows) return;

  const index = rows.findIndex((r) => r.id === id);
  const swapWith = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= rows.length) return;

  const a = rows[index];
  const b = rows[swapWith];
  await supabase
    .from('programmes')
    .update({ display_order: b.display_order })
    .eq('id', a.id);
  await supabase
    .from('programmes')
    .update({ display_order: a.display_order })
    .eq('id', b.id);

  revalidatePublic();
  revalidateAdmin();
}


// ---------------------------------------------------------------------------
// Faculty — always scoped to one programme, managed from that programme's edit
// screen. ONE AT A TIME is correct here: unlike gallery photographs, faculty are
// distinct people with their own name, qualification, and portrait, so there is
// nothing to batch.
// ---------------------------------------------------------------------------

export async function addFaculty(
  programmeId: string,
  _prev: FacultyFormState,
  formData: FormData,
): Promise<FacultyFormState> {
  const { supabase } = await requireActiveAdmin();

  const name = String(formData.get('name') ?? '').trim();
  if (!name) return { error: 'A name is required.' };
  const qualification = String(formData.get('qualification') ?? '').trim();
  const photo = String(formData.get('photo') ?? '').trim();

  // New faculty land at the end of THIS programme's order — the max is scoped to
  // the programme, not global, or every programme after the first would start
  // high.
  const { data: last } = await supabase
    .from('programme_faculty')
    .select('display_order')
    .eq('programme_id', programmeId)
    .order('display_order', { ascending: false })
    .limit(1);
  const nextOrder = (last?.[0]?.display_order ?? 0) + 1;

  const { error } = await supabase.from('programme_faculty').insert({
    programme_id: programmeId,
    name,
    qualification: qualification || null,
    photo: photo || null,
    display_order: nextOrder,
  });
  if (error) {
    console.error('[programmes] addFaculty failed', error);
    return { error: FACULTY_FAILED };
  }

  revalidatePublic(await programmeSlugById(supabase, programmeId));
  revalidateAdmin(programmeId);
  return { error: null };
}

export async function updateFaculty(formData: FormData): Promise<void> {
  const { supabase } = await requireActiveAdmin();

  const id = String(formData.get('id') ?? '');
  const programmeId = String(formData.get('programme_id') ?? '');
  if (!id) return;

  // A blank name would leave an unnamed row on a public roster, so the edit is
  // simply not applied. The field is `required` in the browser too; this is the
  // server's own guard.
  const name = String(formData.get('name') ?? '').trim();
  if (!name) return;
  const qualification = String(formData.get('qualification') ?? '').trim();
  const photo = String(formData.get('photo') ?? '').trim();

  const { error } = await supabase
    .from('programme_faculty')
    .update({
      name,
      qualification: qualification || null,
      photo: photo || null,
    })
    .eq('id', id);
  if (error) {
    console.error('[programmes] updateFaculty failed', error);
    return;
  }

  revalidatePublic(await programmeSlugById(supabase, programmeId));
  revalidateAdmin(programmeId);
}

export async function deleteFaculty(formData: FormData): Promise<void> {
  const { supabase } = await requireActiveAdmin();

  const id = String(formData.get('id') ?? '');
  const programmeId = String(formData.get('programme_id') ?? '');
  if (!id) return;

  // Row only; the Cloudinary portrait is left to the orphan sweep (PRD 10.3).
  const { error } = await supabase
    .from('programme_faculty')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('[programmes] deleteFaculty failed', error);
    return;
  }

  revalidatePublic(await programmeSlugById(supabase, programmeId));
  revalidateAdmin(programmeId);
}

// Reorder WITHIN one programme: the neighbour list is filtered by programme_id,
// so a faculty member can never swap order with one from another programme.
export async function moveFaculty(formData: FormData): Promise<void> {
  const { supabase } = await requireActiveAdmin();

  const id = String(formData.get('id') ?? '');
  const programmeId = String(formData.get('programme_id') ?? '');
  const direction = String(formData.get('direction') ?? '');
  if (!id || !programmeId || (direction !== 'up' && direction !== 'down')) return;

  const { data: rows } = await supabase
    .from('programme_faculty')
    .select('id, display_order')
    .eq('programme_id', programmeId)
    .order('display_order', { ascending: true });
  if (!rows) return;

  const index = rows.findIndex((r) => r.id === id);
  const swapWith = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= rows.length) return;

  const a = rows[index];
  const b = rows[swapWith];
  await supabase
    .from('programme_faculty')
    .update({ display_order: b.display_order })
    .eq('id', a.id);
  await supabase
    .from('programme_faculty')
    .update({ display_order: a.display_order })
    .eq('id', b.id);

  revalidatePublic(await programmeSlugById(supabase, programmeId));
  revalidateAdmin(programmeId);
}
