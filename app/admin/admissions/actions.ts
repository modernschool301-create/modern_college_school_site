'use server';

import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireActiveAdmin } from '@/lib/auth-guard';
import {
  MANAGEMENT_FORM_ID,
  isAdmissionFormId,
  type AdmissionFormId,
} from '@/lib/admission-schemas';

export type AdmissionFormState = { error: string | null; saved: boolean };
export type StreamFormState = { error: string | null; saved: boolean };

// Generic messages for DB failures. Raw Postgres text (e.g. "violates row-level
// security policy") is logged server-side, never surfaced to the browser — the
// convention since the News hardening pass.
const FORM_SAVE_FAILED =
  'Something went wrong saving this form. Please try again.';
const STREAM_SAVE_FAILED =
  'Something went wrong saving this stream. Please try again.';

// The +2 pair the one-click convenience moves together (Decision 4). Named here
// so the pair is defined in exactly one place, and so it is obvious that BBS is
// not in it — a Bachelor intake has nothing to do with a +2 season.
const PLUS_TWO_FORM_IDS: AdmissionFormId[] = [
  'plus_two_management',
  'plus_two_law',
];

// ---------------------------------------------------------------------------
// Revalidation
// ---------------------------------------------------------------------------

// Both public surfaces read these tables live, so every write here refreshes
// them: /admissions lists the published forms and their words, and /apply/{id}
// renders the same row plus the stream picker. Skipping either would leave a
// form the admin just closed still advertised and still submittable.
function revalidateForm(formId?: AdmissionFormId | null) {
  revalidatePath('/admin/admissions');
  revalidatePath('/admissions');
  if (formId) revalidatePath(`/apply/${formId}`);
}

// A stream change is invisible everywhere except the Management form's picker —
// but it can flip that page between the real form and the "opening soon" guard
// (PRD 21.1), so it must not wait for a cache to expire.
function revalidateStreams() {
  revalidatePath('/admin/admissions');
  revalidatePath(`/apply/${MANAGEMENT_FORM_ID}`);
}

// The id arrives from a hidden field, so it is checked against the closed set
// before it reaches a query. Not a security boundary — the UPDATE policy is —
// but it keeps a malformed post from writing to a row that should not exist.
function readFormId(formData: FormData): AdmissionFormId | null {
  const raw = String(formData.get('form_id') ?? '');
  return isAdmissionFormId(raw) ? raw : null;
}

// ---------------------------------------------------------------------------
// The three forms (Decision 4 — three rows forever, no create, no delete)
// ---------------------------------------------------------------------------

/**
 * A form's WORDS and its deadline. Not its publish flag: publishing is a
 * one-click decision an admin makes while looking at the list, and burying it
 * inside a save-the-whole-block form would mean re-submitting a title to open an
 * intake.
 */
export async function updateFormDetails(
  formId: AdmissionFormId,
  _prev: AdmissionFormState,
  formData: FormData,
): Promise<AdmissionFormState> {
  const { supabase } = await requireActiveAdmin();

  if (!isAdmissionFormId(formId)) return { error: FORM_SAVE_FAILED, saved: false };

  const title = String(formData.get('title') ?? '').trim();
  if (!title) return { error: 'A title is required.', saved: false };

  const description = String(formData.get('description') ?? '').trim();

  // A blank date input posts an empty string, which must become NULL — the
  // column is a date, and "" is not one. Blank is the normal state: the deadline
  // is optional and informational (PRD 8.3), so clearing it is a real edit and
  // not an omission to be rejected.
  const deadlineRaw = String(formData.get('deadline') ?? '').trim();
  if (deadlineRaw && !/^\d{4}-\d{2}-\d{2}$/.test(deadlineRaw)) {
    return { error: 'Please choose a valid date, or leave the deadline blank.', saved: false };
  }

  // display_order and is_published are deliberately absent from this write:
  // they are owned by other controls, and including them here would let a stale
  // open form re-close an intake someone opened in another tab.
  const { error } = await supabase
    .from('admission_forms')
    .update({
      title,
      description: description || null,
      deadline: deadlineRaw || null,
    })
    .eq('id', formId);
  if (error) {
    console.error('[admissions] updateFormDetails failed', error);
    return { error: FORM_SAVE_FAILED, saved: false };
  }

  revalidateForm(formId);
  return { error: null, saved: true };
}

/**
 * One form's publish flag. The value posted is the DESIRED state, read from the
 * row the button was rendered against — never a "flip whatever is there now",
 * which would race two admins into undoing each other.
 */
export async function toggleFormPublish(formData: FormData): Promise<void> {
  const { supabase } = await requireActiveAdmin();

  const formId = readFormId(formData);
  if (!formId) return;
  const publish = String(formData.get('publish') ?? '') === 'true';

  const { error } = await supabase
    .from('admission_forms')
    .update({ is_published: publish })
    .eq('id', formId);
  if (error) {
    console.error('[admissions] toggleFormPublish failed', error);
    return;
  }

  revalidateForm(formId);
}

/**
 * The one-click "open/close +2 admissions" convenience (Decision 4).
 *
 * ┌─ THIS CREATES NO LINKED STATE ────────────────────────────────────────────┐
 * │ It is a shortcut for two writes an admin could make one at a time, and    │
 * │ nothing more: it sets is_published on the Management and Law rows in a    │
 * │ single statement and then forgets they were ever touched together. There  │
 * │ is no pair flag, no trigger, and no constraint tying the two rows.        │
 * │                                                                           │
 * │ That matters because Decision 4's whole reason for keeping Law a separate │
 * │ form is that Law must be able to CLOSE EARLY when its limited seats fill  │
 * │ while Management stays open. Using this button must never take that away, │
 * │ so afterwards each form's own toggle still moves that form alone.         │
 * └───────────────────────────────────────────────────────────────────────────┘
 */
export async function toggleAdmissionsPair(formData: FormData): Promise<void> {
  const { supabase } = await requireActiveAdmin();

  const publish = String(formData.get('publish') ?? '') === 'true';

  const { error } = await supabase
    .from('admission_forms')
    .update({ is_published: publish })
    .in('id', PLUS_TWO_FORM_IDS);
  if (error) {
    console.error('[admissions] toggleAdmissionsPair failed', error);
    return;
  }

  // Both /apply pages, since both rows moved.
  revalidatePath('/admin/admissions');
  revalidatePath('/admissions');
  for (const id of PLUS_TWO_FORM_IDS) revalidatePath(`/apply/${id}`);
}

// ---------------------------------------------------------------------------
// Management streams (Decision 5 — retire, never delete)
// ---------------------------------------------------------------------------

// `name` is UNIQUE, and that interacts with retirement on purpose (see the
// migration): re-offering a stream the school dropped is RESTORING the existing
// row, not inserting a second one. So a name clash is not an error condition to
// report — it is a signpost, and the message has to say where to go.
//
// The lookup is case-INSENSITIVE while the constraint is case-sensitive, which
// is deliberate: 'computer science' would insert cleanly next to 'Computer
// Science' and give the applicant picker two rows meaning the same thing. This
// catches that before the database ever gets the chance to allow it.
async function findStreamByName(
  supabase: SupabaseClient,
  name: string,
): Promise<{ name: string; is_available: boolean } | null> {
  const { data, error } = await supabase
    .from('management_streams')
    .select('name, is_available')
    // ilike with no wildcards is an exact, case-insensitive match.
    .ilike('name', name)
    .limit(1);
  if (error) {
    console.error('[admissions] findStreamByName failed', error);
    return null;
  }
  return (data?.[0] as { name: string; is_available: boolean } | undefined) ?? null;
}

function duplicateStreamMessage(existing: {
  name: string;
  is_available: boolean;
}): string {
  return existing.is_available
    ? `There is already a stream called “${existing.name}”.`
    : `“${existing.name}” already exists but is retired. Restore it in the list below rather than adding it again — that keeps every application already made under it filterable by the same name.`;
}

export async function addStream(
  _prev: StreamFormState,
  formData: FormData,
): Promise<StreamFormState> {
  const { supabase } = await requireActiveAdmin();

  const name = String(formData.get('name') ?? '').trim();
  if (!name) return { error: 'A stream name is required.', saved: false };
  if (name.length > 120) {
    return { error: 'That name is longer than we can store. Please shorten it.', saved: false };
  }

  const existing = await findStreamByName(supabase, name);
  if (existing) return { error: duplicateStreamMessage(existing), saved: false };

  // End of the list, the max+1 pattern used by every other ordered table here.
  const { data: last } = await supabase
    .from('management_streams')
    .select('display_order')
    .order('display_order', { ascending: false })
    .limit(1);
  const nextOrder = (last?.[0]?.display_order ?? 0) + 1;

  const { error } = await supabase
    .from('management_streams')
    .insert({ name, display_order: nextOrder });
  if (error) {
    // 23505 = unique_violation. The check above already caught the ordinary
    // case; this is the race (two admins adding the same stream at once) and a
    // last line of defence so a raw Postgres constraint message can never reach
    // the browser.
    if (error.code === '23505') {
      const clash = await findStreamByName(supabase, name);
      return {
        error: clash
          ? duplicateStreamMessage(clash)
          : `There is already a stream called “${name}”.`,
        saved: false,
      };
    }
    console.error('[admissions] addStream failed', error);
    return { error: STREAM_SAVE_FAILED, saved: false };
  }

  revalidateStreams();
  return { error: null, saved: true };
}

/**
 * Rename in place. State-returning rather than void because renaming INTO a
 * retired stream's name is a real and unremarkable mistake, and silently doing
 * nothing would look like a broken button.
 *
 * The stored name is what past submissions display alongside their own text
 * copy of it, so a rename here does not rewrite history — a submission keeps the
 * label it was made under (PRD 8.3).
 */
export async function renameStream(
  streamId: string,
  _prev: StreamFormState,
  formData: FormData,
): Promise<StreamFormState> {
  const { supabase } = await requireActiveAdmin();

  if (!streamId) return { error: STREAM_SAVE_FAILED, saved: false };

  const name = String(formData.get('name') ?? '').trim();
  if (!name) return { error: 'A stream name is required.', saved: false };
  if (name.length > 120) {
    return { error: 'That name is longer than we can store. Please shorten it.', saved: false };
  }

  // A clash with a DIFFERENT row only — re-saving a row's own name unchanged
  // (or with different capitalisation) is not a duplicate.
  const { data: clash } = await supabase
    .from('management_streams')
    .select('id, name, is_available')
    .ilike('name', name)
    .neq('id', streamId)
    .limit(1);
  const other = clash?.[0] as
    | { name: string; is_available: boolean }
    | undefined;
  if (other) return { error: duplicateStreamMessage(other), saved: false };

  const { error } = await supabase
    .from('management_streams')
    .update({ name })
    .eq('id', streamId);
  if (error) {
    if (error.code === '23505') {
      return { error: `There is already a stream called “${name}”.`, saved: false };
    }
    console.error('[admissions] renameStream failed', error);
    return { error: STREAM_SAVE_FAILED, saved: false };
  }

  revalidateStreams();
  return { error: null, saved: true };
}

/**
 * Swap a stream with its neighbour. Operates over the WHOLE list, retired rows
 * included, because that is the list the admin is looking at — reordering
 * against a hidden available-only sequence would move rows by amounts that make
 * no sense on screen.
 */
export async function moveStream(formData: FormData): Promise<void> {
  const { supabase } = await requireActiveAdmin();

  const id = String(formData.get('id') ?? '');
  const direction = String(formData.get('direction') ?? '');
  if (!id || (direction !== 'up' && direction !== 'down')) return;

  const { data: rows, error } = await supabase
    .from('management_streams')
    .select('id, display_order')
    .order('display_order', { ascending: true });
  if (error) {
    console.error('[admissions] moveStream read failed', error);
    return;
  }
  if (!rows) return;

  const index = rows.findIndex((r) => r.id === id);
  const swapWith = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= rows.length) return;

  const a = rows[index];
  const b = rows[swapWith];
  await supabase
    .from('management_streams')
    .update({ display_order: b.display_order })
    .eq('id', a.id);
  await supabase
    .from('management_streams')
    .update({ display_order: a.display_order })
    .eq('id', b.id);

  revalidateStreams();
}

/**
 * RETIRE / RESTORE — the only removal there is (Decision 5, PRD 9.5).
 *
 * This flips a flag. It is not a soft delete dressed up: the row stays, keeps
 * its name and its place in the order, and comes back with one click. There is
 * no delete action in this file and no DELETE policy or grant on the table, so
 * there is nowhere for one to be added by accident.
 */
export async function toggleStreamAvailability(
  formData: FormData,
): Promise<void> {
  const { supabase } = await requireActiveAdmin();

  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const available = String(formData.get('available') ?? '') === 'true';

  const { error } = await supabase
    .from('management_streams')
    .update({ is_available: available })
    .eq('id', id);
  if (error) {
    console.error('[admissions] toggleStreamAvailability failed', error);
    return;
  }

  revalidateStreams();
}
