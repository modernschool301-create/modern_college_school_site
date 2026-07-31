'use server';

import { revalidatePath } from 'next/cache';
import { requireActiveAdmin } from '@/lib/auth-guard';
import { SUBMISSION_STATUSES, type SubmissionStatus } from '@/lib/admission-schemas';

// Admin pipeline writes (PRD 30.4). Both actions use the COOKIE (anon-key)
// server client returned by requireActiveAdmin, never the service key: this is
// an authenticated admin acting under RLS, and the
// admission_submissions_update_admin policy is what actually permits the write.
// requireActiveAdmin is defence-in-depth on top of it, reading the role LIVE
// from profiles so a deactivated admin bounces to /login on their next action
// rather than getting a raw policy error.
//
// There is no delete action here and there is no delete policy behind one —
// archiving is a status value (see the migration).

const GENERIC_ERROR = 'Something went wrong. Please try again.';

export type SubmissionActionState = { error: string | null };

export async function setSubmissionStatus(
  _prevState: SubmissionActionState,
  formData: FormData,
): Promise<SubmissionActionState> {
  const { supabase } = await requireActiveAdmin();

  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');

  // The five pipeline values, and no ordering rule between them: 'archived' is
  // reachable from ANY state (Decision 8), and so is any correction of a
  // mis-clicked status. The enum column rejects anything else regardless.
  if (!id || !SUBMISSION_STATUSES.includes(status as SubmissionStatus)) {
    return { error: GENERIC_ERROR };
  }

  const { error } = await supabase
    .from('admission_submissions')
    .update({ status })
    .eq('id', id);

  if (error) {
    // Never log applicant PII — the failure only.
    console.error('submission status update failed:', error.message);
    return { error: GENERIC_ERROR };
  }

  revalidatePath('/admin/submissions');
  return { error: null };
}

/**
 * Dismiss the fail-open bot flag (Decision 7a).
 *
 * One click, no confirmation, and deliberately ONE-WAY: this clears
 * 'unverified_review' to 'verified' and offers no path back. The flag means "an
 * automated check was ambiguous, a human should glance at this" — once a human
 * has, the question is answered, and re-flagging would only re-queue work
 * already done. A junk row is archived, not re-flagged.
 */
export async function markSubmissionVerified(
  _prevState: SubmissionActionState,
  formData: FormData,
): Promise<SubmissionActionState> {
  const { supabase } = await requireActiveAdmin();

  const id = String(formData.get('id') ?? '');
  if (!id) {
    return { error: GENERIC_ERROR };
  }

  const { error } = await supabase
    .from('admission_submissions')
    .update({ verification: 'verified' })
    .eq('id', id);

  if (error) {
    console.error('submission verification update failed:', error.message);
    return { error: GENERIC_ERROR };
  }

  revalidatePath('/admin/submissions');
  return { error: null };
}
