import type { createClient } from '@/lib/supabase/server';
import {
  MANAGEMENT_FORM_ID,
  type AdmissionForm,
  type ManagementStreamRow,
} from '@/lib/admission-schemas';

// THE EMPTY-PICKER WARNING (PRD 21.1, Decision 5), defined ONCE.
//
// +2 Management is published but no stream is available, so the form reads as
// open on /admissions while nobody can actually apply. The public side is
// already safe — /apply/plus_two_management shows "admissions opening soon"
// rather than a broken empty picker — so this is not a bug for an applicant. It
// is silently unproductive for the school, and the only people who can fix it
// are the ones looking at an admin page.
//
// It is surfaced in two places (/admin/admissions, which can fix it, and the
// dashboard, which is where an admin lands), and the two must never disagree.
// So the RULE lives here as a pure predicate and each caller supplies the two
// numbers the cheapest way it can: the admissions page already holds both full
// lists, the dashboard counts without fetching a row.

export function managementOpenWithNoStreams(input: {
  managementPublished: boolean;
  availableStreamCount: number;
}): boolean {
  return input.managementPublished && input.availableStreamCount === 0;
}

// For a caller that already has the rows in hand (the admissions page).
export function managementOpenWithNoStreamsFromRows(
  forms: Pick<AdmissionForm, 'id' | 'is_published'>[],
  streams: Pick<ManagementStreamRow, 'is_available'>[],
): boolean {
  return managementOpenWithNoStreams({
    managementPublished: Boolean(
      forms.find((form) => form.id === MANAGEMENT_FORM_ID)?.is_published,
    ),
    availableStreamCount: streams.filter((stream) => stream.is_available).length,
  });
}

// For a caller that only needs the answer (the dashboard). Two reads, neither of
// which returns a row: one column off a single known form, and a head-only count
// of the available streams.
export async function checkManagementStreamWarning(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<boolean> {
  const [formResult, streamResult] = await Promise.all([
    supabase
      .from('admission_forms')
      .select('is_published')
      .eq('id', MANAGEMENT_FORM_ID)
      .maybeSingle(),
    supabase
      .from('management_streams')
      .select('id', { count: 'exact', head: true })
      .eq('is_available', true),
  ]);

  return managementOpenWithNoStreams({
    managementPublished: Boolean(formResult.data?.is_published),
    availableStreamCount: streamResult.count ?? 0,
  });
}
