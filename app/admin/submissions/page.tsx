import { createClient } from '@/lib/supabase/server';
import { SubmissionList } from '@/components/admin/submissions/submission-list';
import {
  ADMISSION_FORM_IDS,
  ADMISSION_FORM_LABELS,
  ADMISSION_REFERENCE_PREFIXES,
  type AdmissionSubmission,
} from '@/lib/admission-schemas';

export default async function AdminSubmissionsPage() {
  // Admin-only: the /admin layout already enforced the live active-admin check
  // (reading profiles fresh, never the JWT). This SELECT is additionally gated
  // by admission_submissions_select_admin — hiding the page would not be the
  // security measure; that policy is.
  //
  // ONE read of every submission (PRD 30.4). There is no ownership model here —
  // these are staff-only leads, and no applicant has an account to own one.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('admission_submissions')
    .select(
      'id, reference, form_id, full_name, email, phone, stream, payload, status, verification, created_at',
    )
    .order('created_at', { ascending: false });

  const submissions = (data ?? []) as AdmissionSubmission[];

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Submissions</h1>
      {/* The reference legend. Staff take these numbers over the phone, so the
          prefix-to-form mapping needs to be readable without opening a row. */}
      <p className="mt-2 text-sm text-ink-muted">
        Admission applications across all three forms, newest first. References
        run{' '}
        {ADMISSION_FORM_IDS.map((id) => `${ADMISSION_REFERENCE_PREFIXES[id]}-`).join(
          ' / ',
        )}{' '}
        for {ADMISSION_FORM_IDS.map((id) => ADMISSION_FORM_LABELS[id]).join(' / ')}.
        Applications are archived, never deleted.
      </p>

      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          Could not load applications: {error.message}
        </p>
      )}

      <div className="mt-6">
        <SubmissionList submissions={submissions} />
      </div>
    </main>
  );
}
