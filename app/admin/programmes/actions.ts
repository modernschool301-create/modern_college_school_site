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
export type SpecializationFormState = { error: string | null };

// Generic messages for DB failures. Raw Postgres text (e.g. "violates row-level
// security policy") is logged server-side, never surfaced to the browser.
const SAVE_FAILED = 'Something went wrong saving this programme. Please try again.';
const FACULTY_FAILED =
  'Something went wrong saving this faculty member. Please try again.';
const SPECIALIZATION_FAILED =
  'Something went wrong saving this specialization. Please try again.';
const SPECIALIZATION_FACULTY_FAILED =
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

// A specialization now has a public page of its OWN, nested under its parent's,
// so a change to one can invalidate up to three public addresses: the index, the
// parent programme page (whose card shows the title/description/image), and the
// specialization page itself.
function revalidateSpecializationPublic(
  programmeSlug?: string | null,
  specializationSlug?: string | null,
) {
  revalidatePublic(programmeSlug);
  if (programmeSlug && specializationSlug) {
    revalidatePath(`/programmes/${programmeSlug}/${specializationSlug}`);
  }
}

function revalidateSpecializationAdmin(
  programmeId?: string,
  specializationId?: string,
) {
  revalidateAdmin(programmeId);
  if (programmeId && specializationId) {
    revalidatePath(
      `/admin/programmes/${programmeId}/specializations/${specializationId}/edit`,
    );
  }
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

// A specialization slug that is unique WITHIN its parent programme — the
// table's unique constraint is (programme_id, slug), not slug alone, so the
// clash query is filtered by programme. Two programmes may each have a
// "computer-science"; one programme may not have two.
async function uniqueSpecializationSlug(
  supabase: SupabaseClient,
  programmeId: string,
  base: string,
  excludeId?: string,
): Promise<string> {
  const root = base || 'specialization';
  let candidate = root;
  let n = 1;
  while (true) {
    const { data } = await supabase
      .from('programme_specializations')
      .select('id')
      .eq('programme_id', programmeId)
      .eq('slug', candidate)
      .limit(1);
    const clash = data?.[0] && data[0].id !== excludeId;
    if (!clash) return candidate;
    n += 1;
    candidate = `${root}-${n}`;
  }
}

// The slug of the programme a CHILD row (faculty or specialization) belongs to,
// so those actions can revalidate the public detail page they affect.
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

// Everything needed to address a specialization's public page and its admin
// screens, resolved from the row id alone. GRANDCHILD actions (specialization
// faculty) hold only a specialization_id, and a delete must resolve this BEFORE
// the row disappears.
type SpecializationContext = {
  programmeId: string;
  programmeSlug: string | null;
  specializationSlug: string;
};

async function specializationContext(
  supabase: SupabaseClient,
  specializationId: string,
): Promise<SpecializationContext | null> {
  const { data } = await supabase
    .from('programme_specializations')
    .select('slug, programme_id')
    .eq('id', specializationId)
    .single();
  if (!data) return null;

  return {
    programmeId: data.programme_id as string,
    programmeSlug: await programmeSlugById(supabase, data.programme_id as string),
    specializationSlug: data.slug as string,
  };
}

// Revalidate every surface a specialization or one of its faculty rows touches:
// the programmes index, the parent programme page, the specialization page, and
// both admin screens. Takes a resolved context so a DELETE can look the row up
// before removing it.
function revalidateSpecializationEverywhere(
  ctx: SpecializationContext | null,
  specializationId?: string,
) {
  if (!ctx) {
    // The row is gone or unreadable; the index is still worth refreshing.
    revalidatePublic();
    revalidateAdmin();
    return;
  }
  revalidateSpecializationPublic(ctx.programmeSlug, ctx.specializationSlug);
  revalidateSpecializationAdmin(ctx.programmeId, specializationId);
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

  // The faculty and specialization ROWS go with it via ON DELETE CASCADE. The
  // Cloudinary assets do NOT — they are left to the monthly orphan
  // reconciliation (PRD 10.3), the project-wide pattern.
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


// ---------------------------------------------------------------------------
// Specializations (sub-programmes) — the same child-of-one-programme shape as
// faculty above, managed from that programme's edit screen. ONE AT A TIME, like
// faculty and unlike gallery photographs: each row is a title, a description,
// and possibly an image, all typed out — there is nothing to batch.
//
// A GENERAL capability: any programme may own these. NOT the Admissions stream
// picker — `management_streams` (Phase 3, PRD Decision 5) is a separate table
// with separate rules (retired, never deleted). See the migration header.
//
// ┌─ THE SLUG IS FROZEN AT CREATION ──────────────────────────────────────────┐
// │ It is derived from the title on CREATE and never again. It used to follow │
// │ the title on every update, which was harmless while nothing read it — but │
// │ it is now the last segment of a real public URL                           │
// │ (/programmes/<programme>/<specialization>), and a rename would silently   │
// │ move the page, breaking every existing link to it with no warning and no  │
// │ redirect. Correcting a typo in a title must not be a URL change.          │
// │                                                                           │
// │ Changing the address is therefore a DELIBERATE edit of the slug field on  │
// │ the specialization's own edit screen. It stays scoped-unique either way.  │
// └───────────────────────────────────────────────────────────────────────────┘
// ---------------------------------------------------------------------------

export async function addSpecialization(
  programmeId: string,
  _prev: SpecializationFormState,
  formData: FormData,
): Promise<SpecializationFormState> {
  const { supabase } = await requireActiveAdmin();

  const title = String(formData.get('title') ?? '').trim();
  if (!title) return { error: 'A title is required.' };
  const description = String(formData.get('description') ?? '').trim();
  const image = String(formData.get('image') ?? '').trim();

  // New rows land at the end of THIS programme's order — the max is scoped to
  // the programme, not global, or every programme after the first would start
  // high.
  const { data: last } = await supabase
    .from('programme_specializations')
    .select('display_order')
    .eq('programme_id', programmeId)
    .order('display_order', { ascending: false })
    .limit(1);
  const nextOrder = (last?.[0]?.display_order ?? 0) + 1;

  const slug = await uniqueSpecializationSlug(
    supabase,
    programmeId,
    slugifyProgramme(title),
  );

  const { error } = await supabase.from('programme_specializations').insert({
    programme_id: programmeId,
    title,
    slug,
    description: description || null,
    image: image || null,
    display_order: nextOrder,
  });
  if (error) {
    console.error('[programmes] addSpecialization failed', error);
    return { error: SPECIALIZATION_FAILED };
  }

  revalidatePublic(await programmeSlugById(supabase, programmeId));
  revalidateAdmin(programmeId);
  return { error: null };
}

// Edits a specialization's own fields, from its own edit screen. State-returning
// (not void) like updateProgramme, because this is a full form with validation
// to report rather than a one-button row action.
export async function updateSpecialization(
  specializationId: string,
  _prev: SpecializationFormState,
  formData: FormData,
): Promise<SpecializationFormState> {
  const { supabase } = await requireActiveAdmin();

  const programmeId = String(formData.get('programme_id') ?? '');
  if (!programmeId) return { error: SPECIALIZATION_FAILED };

  const title = String(formData.get('title') ?? '').trim();
  if (!title) return { error: 'A title is required.' };
  const description = String(formData.get('description') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();
  const image = String(formData.get('image') ?? '').trim();

  // The address the ADMIN typed, not one derived from the title — see the
  // frozen-slug box above. An emptied field falls back to the previous slug
  // rather than to the title, so clearing the box cannot silently move a live
  // page either.
  const { data: existing } = await supabase
    .from('programme_specializations')
    .select('slug')
    .eq('id', specializationId)
    .single();

  const requested = slugifyProgramme(String(formData.get('slug') ?? ''));
  const slug = await uniqueSpecializationSlug(
    supabase,
    programmeId,
    requested || (existing?.slug as string) || slugifyProgramme(title),
    specializationId,
  );

  const { error } = await supabase
    .from('programme_specializations')
    .update({
      title,
      slug,
      description: description || null,
      body: body || null,
      image: image || null,
    })
    .eq('id', specializationId);
  if (error) {
    console.error('[programmes] updateSpecialization failed', error);
    return { error: SPECIALIZATION_FAILED };
  }

  const programmeSlug = await programmeSlugById(supabase, programmeId);
  revalidateSpecializationPublic(programmeSlug, slug);
  // A deliberately re-addressed specialization leaves its old page behind;
  // refresh that too so the stale route does not keep serving.
  if (existing?.slug && existing.slug !== slug) {
    revalidateSpecializationPublic(programmeSlug, existing.slug as string);
  }
  revalidateSpecializationAdmin(programmeId, specializationId);
  redirect(`/admin/programmes/${programmeId}/edit`);
}

export async function deleteSpecialization(formData: FormData): Promise<void> {
  const { supabase } = await requireActiveAdmin();

  const id = String(formData.get('id') ?? '');
  if (!id) return;

  // Resolved BEFORE the delete: afterwards there is no row to read the slug
  // from, and the specialization's own public page needs revalidating by name.
  const ctx = await specializationContext(supabase, id);

  // Row only; the Cloudinary image is left to the orphan sweep (PRD 10.3). Its
  // FACULTY rows go with it via ON DELETE CASCADE — the second link in the
  // chain that starts at programmes.
  //
  // A hard delete is correct HERE and would not be on management_streams: no
  // submission, past or future, refers to a specialization row.
  const { error } = await supabase
    .from('programme_specializations')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('[programmes] deleteSpecialization failed', error);
    return;
  }

  revalidateSpecializationEverywhere(ctx);
}

// Reorder WITHIN one programme: the neighbour list is filtered by programme_id,
// so a specialization can never swap order with one from another programme.
export async function moveSpecialization(formData: FormData): Promise<void> {
  const { supabase } = await requireActiveAdmin();

  const id = String(formData.get('id') ?? '');
  const programmeId = String(formData.get('programme_id') ?? '');
  const direction = String(formData.get('direction') ?? '');
  if (!id || !programmeId || (direction !== 'up' && direction !== 'down')) return;

  const { data: rows } = await supabase
    .from('programme_specializations')
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
    .from('programme_specializations')
    .update({ display_order: b.display_order })
    .eq('id', a.id);
  await supabase
    .from('programme_specializations')
    .update({ display_order: a.display_order })
    .eq('id', b.id);

  revalidatePublic(await programmeSlugById(supabase, programmeId));
  revalidateAdmin(programmeId);
}


// ---------------------------------------------------------------------------
// Specialization faculty — a specialization's OWN teaching staff, managed from
// the specialization's own edit screen.
//
// A deliberate mirror of the programme-faculty actions above against a mirrored
// table (see the migration): same one-at-a-time shape, same scoped reorder, same
// orphan-sweep stance on the portrait. They are NOT merged into one set of
// generic actions — programme_faculty is live and working, and a shared
// polymorphic path would have to carry a "which parent?" branch through every
// query to save a few dozen lines.
//
// These actions hold only a specialization_id. Everything else needed to
// revalidate — the parent programme's id and slug, this specialization's slug —
// is resolved through specializationContext().
// ---------------------------------------------------------------------------

export async function addSpecializationFaculty(
  specializationId: string,
  _prev: FacultyFormState,
  formData: FormData,
): Promise<FacultyFormState> {
  const { supabase } = await requireActiveAdmin();

  const name = String(formData.get('name') ?? '').trim();
  if (!name) return { error: 'A name is required.' };
  const qualification = String(formData.get('qualification') ?? '').trim();
  const photo = String(formData.get('photo') ?? '').trim();

  // New faculty land at the end of THIS specialization's order — scoped, not
  // global, or every specialization after the first would start high.
  const { data: last } = await supabase
    .from('specialization_faculty')
    .select('display_order')
    .eq('specialization_id', specializationId)
    .order('display_order', { ascending: false })
    .limit(1);
  const nextOrder = (last?.[0]?.display_order ?? 0) + 1;

  const { error } = await supabase.from('specialization_faculty').insert({
    specialization_id: specializationId,
    name,
    qualification: qualification || null,
    photo: photo || null,
    display_order: nextOrder,
  });
  if (error) {
    console.error('[programmes] addSpecializationFaculty failed', error);
    return { error: SPECIALIZATION_FACULTY_FAILED };
  }

  const ctx = await specializationContext(supabase, specializationId);
  revalidateSpecializationEverywhere(ctx, specializationId);
  return { error: null };
}

export async function updateSpecializationFaculty(
  formData: FormData,
): Promise<void> {
  const { supabase } = await requireActiveAdmin();

  const id = String(formData.get('id') ?? '');
  const specializationId = String(formData.get('specialization_id') ?? '');
  if (!id || !specializationId) return;

  // A blank name would leave an unnamed row on a public roster, so the edit is
  // simply not applied. The field is `required` in the browser too; this is the
  // server's own guard.
  const name = String(formData.get('name') ?? '').trim();
  if (!name) return;
  const qualification = String(formData.get('qualification') ?? '').trim();
  const photo = String(formData.get('photo') ?? '').trim();

  const { error } = await supabase
    .from('specialization_faculty')
    .update({
      name,
      qualification: qualification || null,
      photo: photo || null,
    })
    .eq('id', id);
  if (error) {
    console.error('[programmes] updateSpecializationFaculty failed', error);
    return;
  }

  const ctx = await specializationContext(supabase, specializationId);
  revalidateSpecializationEverywhere(ctx, specializationId);
}

export async function deleteSpecializationFaculty(
  formData: FormData,
): Promise<void> {
  const { supabase } = await requireActiveAdmin();

  const id = String(formData.get('id') ?? '');
  const specializationId = String(formData.get('specialization_id') ?? '');
  if (!id || !specializationId) return;

  // Row only; the Cloudinary portrait is left to the orphan sweep (PRD 10.3).
  const { error } = await supabase
    .from('specialization_faculty')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('[programmes] deleteSpecializationFaculty failed', error);
    return;
  }

  const ctx = await specializationContext(supabase, specializationId);
  revalidateSpecializationEverywhere(ctx, specializationId);
}

// Reorder WITHIN one specialization: the neighbour list is filtered by
// specialization_id, so a faculty member can never swap order with one from
// another specialization — or with one on a programme's own roster, which is a
// different table entirely.
export async function moveSpecializationFaculty(
  formData: FormData,
): Promise<void> {
  const { supabase } = await requireActiveAdmin();

  const id = String(formData.get('id') ?? '');
  const specializationId = String(formData.get('specialization_id') ?? '');
  const direction = String(formData.get('direction') ?? '');
  if (!id || !specializationId || (direction !== 'up' && direction !== 'down')) {
    return;
  }

  const { data: rows } = await supabase
    .from('specialization_faculty')
    .select('id, display_order')
    .eq('specialization_id', specializationId)
    .order('display_order', { ascending: true });
  if (!rows) return;

  const index = rows.findIndex((r) => r.id === id);
  const swapWith = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= rows.length) return;

  const a = rows[index];
  const b = rows[swapWith];
  await supabase
    .from('specialization_faculty')
    .update({ display_order: b.display_order })
    .eq('id', a.id);
  await supabase
    .from('specialization_faculty')
    .update({ display_order: a.display_order })
    .eq('id', b.id);

  const ctx = await specializationContext(supabase, specializationId);
  revalidateSpecializationEverywhere(ctx, specializationId);
}
