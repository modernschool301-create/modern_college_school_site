import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { AdmissionFormsSection } from '@/components/admin/admissions/admission-forms';
import { ManagementStreamsSection } from '@/components/admin/admissions/management-streams';
import {
  MANAGEMENT_FORM_ID,
  type AdmissionForm,
  type ManagementStreamRow,
} from '@/lib/admission-schemas';

// /admin/admissions (PRD 29). The CONFIGURATION half of admissions — what the
// three forms say and whether they are open, plus the Management stream list.
// The applications themselves live at /admin/submissions.
//
// Shaped like Settings rather than like a content module: a small fixed set of
// things to edit, with no create and no delete. Both are structural, not
// stylistic — admission_forms has no INSERT or DELETE policy (three rows,
// forever, Decision 4) and management_streams has no DELETE policy or grant at
// all (retire, never delete, Decision 5).
//
// Both reads run with the admin's own session, so RLS returns the drafts and the
// retired rows the public cannot see. The same queries as anon return only
// published forms and available streams — that difference is enforced by the
// policies, not by anything on this page.
export default async function AdminAdmissionsPage() {
  const supabase = await createClient();

  const [formsResult, streamsResult] = await Promise.all([
    supabase
      .from('admission_forms')
      .select('id, title, description, is_published, deadline, display_order')
      .order('display_order', { ascending: true }),
    supabase
      .from('management_streams')
      .select('id, name, display_order, is_available')
      .order('display_order', { ascending: true }),
  ]);

  if (formsResult.error) {
    console.error('[admissions] forms read failed', formsResult.error);
  }
  if (streamsResult.error) {
    console.error('[admissions] streams read failed', streamsResult.error);
  }

  const forms = (formsResult.data ?? []) as AdmissionForm[];
  const streams = (streamsResult.data ?? []) as ManagementStreamRow[];

  // THE ADMIN-SIDE HALF OF THE EMPTY-PICKER GUARD (PRD 21.1, Decision 5).
  //
  // The public half already exists and is the safety net: /apply/plus_two_management
  // shows "admissions opening soon" rather than an empty picker, so this state
  // is never broken for an applicant. But it IS silently unproductive — the form
  // reads as open on /admissions while nobody can actually apply — and the only
  // person who can fix it is looking at this page. Hence a warning here, and
  // deliberately not a block: refusing to publish would be the system overruling
  // an admin who may be about to add the streams in the next minute.
  const managementForm = forms.find((f) => f.id === MANAGEMENT_FORM_ID);
  const showEmptyStreamWarning =
    !!managementForm?.is_published && streams.every((s) => !s.is_available);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="font-display text-h2 text-green-ink">Admissions</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">
        Which intakes are open, what each form says, and the streams the +2
        Management form offers. Applications that come in are at{' '}
        <Link
          href="/admin/submissions"
          className="font-medium text-green-brand underline-offset-2 hover:underline"
        >
          Submissions
        </Link>
        .
      </p>

      {showEmptyStreamWarning && (
        <div
          role="status"
          className="mt-8 rounded-md border border-warning/40 bg-warning/10 p-4"
        >
          <p className="font-medium text-green-ink">
            +2 Management is open, but no stream is being offered
          </p>
          <p className="mt-2 max-w-2xl text-sm text-ink-muted">
            The form asks applicants which stream they want, and right now the
            list is empty, so nobody can apply. Visitors are shown{' '}
            &ldquo;admissions opening soon&rdquo; rather than a broken empty
            picker — nothing looks wrong to them, and no application is being
            lost — but none is being taken either. Add or restore a stream below
            and the form starts working immediately.
          </p>
        </div>
      )}

      <div className="mt-10">
        <AdmissionFormsSection forms={forms} />
      </div>

      <hr className="mt-12 border-line" />

      <div className="mt-12">
        <ManagementStreamsSection streams={streams} />
      </div>
    </main>
  );
}
