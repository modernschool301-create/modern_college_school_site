'use server';

import { headers } from 'next/headers';
import { Resend } from 'resend';
import { createServiceClient } from '@/lib/supabase/service';
import { clientIpFromHeaders, evaluateSubmission } from '@/lib/bot-protection';
import { getOfficeNotificationEmail } from '@/lib/settings';
import {
  ADMISSION_FORM_LABELS,
  admissionFieldLabel,
  collectAdmissionAnswers,
  formRequiresStream,
  isAdmissionFormId,
  splitAdmissionAnswers,
  type AdmissionFormId,
} from '@/lib/admission-schemas';

// The admissions write path (PRD 9.4, 21.1.4). A deliberate mirror of
// submitContactMessage — same ordering, same fail-open posture, same
// never-log-PII rule — with more fields and three extra server-side checks
// (published, schema, stream availability). The contact action is the proven
// pattern; this stays in step with it on purpose.

export type ApplyState = {
  ok: boolean;
  error: string | null;
  // The applicant's reference number, present only on success. This is the
  // number they quote to the office on the phone (Decision 8), so it is
  // returned to be shown prominently — there is no other way for them to
  // retrieve it (no public accounts, Decision 1).
  reference: string | null;
};

// Shown for hard bot rejects and unexpected failures — never explains the bot
// logic to the submitter (CLAUDE.md / PRD 22).
const GENERIC_ERROR = 'Something went wrong. Please try again.';

const CLOSED_ERROR =
  'This admission form is not open at the moment. Please check the admissions page for the current intake.';

export async function submitAdmission(
  _prevState: ApplyState,
  formData: FormData,
): Promise<ApplyState> {
  // 1. BOT CHECKS FIRST, before any write and before any database read that a
  //    flood could make expensive (PRD 9.4, 10.4).
  const requestHeaders = await headers();
  const verdict = evaluateSubmission({
    // A DIFFERENT decoy name from the contact form's 'company': one honeypot
    // name across the whole site is one thing for a bot author to learn once.
    honeypot: formData.get('website'),
    renderedAt: formData.get('rendered_at'),
    ip: clientIpFromHeaders(requestHeaders),
  });

  // Hard bot signal (filled honeypot or clearly-too-fast): write nothing.
  if (verdict.outcome === 'reject') {
    return { ok: false, error: GENERIC_ERROR, reference: null };
  }
  // Otherwise verdict.verification is 'verified' or (fail-open, Decision 7a)
  // 'unverified_review' — carried through to the row, never used to drop it.

  // 2. Which form, and is it actually open? BOTH re-checked server-side: the
  //    form id arrives in a hidden input and the browser is not trusted with
  //    either answer. A page left open across an unpublish must not still
  //    accept a submission.
  const rawFormId = String(formData.get('form_id') ?? '');
  if (!isAdmissionFormId(rawFormId)) {
    return { ok: false, error: GENERIC_ERROR, reference: null };
  }
  const formId: AdmissionFormId = rawFormId;

  // The SERVICE client: this action has no session (the submitter is anonymous)
  // and admission_submissions has no insert policy for anyone. It bypasses RLS,
  // which is exactly why every check above and below runs first (PRD 9.6).
  const supabase = createServiceClient();

  const { data: form, error: formError } = await supabase
    .from('admission_forms')
    .select('id, is_published')
    .eq('id', formId)
    .maybeSingle();

  if (formError) {
    console.error('admission form read failed:', formError.message);
    return { ok: false, error: GENERIC_ERROR, reference: null };
  }
  if (!form || !form.is_published) {
    return { ok: false, error: CLOSED_ERROR, reference: null };
  }

  // 3. Validate against the form's CODE schema — the same schema that rendered
  //    the page, so the two cannot disagree about which questions exist.
  const answers = collectAdmissionAnswers(formId, formData);
  if (!answers.ok) {
    return { ok: false, error: answers.error, reference: null };
  }
  const { full_name, email, phone, payload } = splitAdmissionAnswers(answers.values);

  // 4. The Management stream (Decision 5). The picker submits a stream ID; the
  //    server resolves it to a NAME and stores that name as text. Two reasons
  //    for the indirection: the id is an exact key (a renamed stream still
  //    resolves), and the availability filter here is what stops a page left
  //    open across a retirement from filing an application under a stream the
  //    school has stopped offering.
  let stream: string | null = null;
  if (formRequiresStream(formId)) {
    const streamId = String(formData.get('stream_id') ?? '').trim();
    if (!streamId) {
      return { ok: false, error: 'Please choose a stream.', reference: null };
    }

    const { data: streamRow, error: streamError } = await supabase
      .from('management_streams')
      .select('name')
      .eq('id', streamId)
      .eq('is_available', true)
      .maybeSingle();

    if (streamError) {
      console.error('management stream read failed:', streamError.message);
      return { ok: false, error: GENERIC_ERROR, reference: null };
    }
    if (!streamRow) {
      return {
        ok: false,
        error:
          'That stream is no longer being offered. Please choose another from the list.',
        reference: null,
      };
    }
    stream = streamRow.name;
  }

  // 5. Allocate the reference, then write ONE row.
  //
  //    reference / status / verification / timestamps are ALL set server-side
  //    (PRD 9.4): the reference comes from the database counter that never
  //    hands out the same number twice, verification comes from the bot verdict
  //    above, and status ('new') plus both timestamps default in the table.
  //    None of the four is ever read from the browser.
  const { data: reference, error: referenceError } = await supabase.rpc(
    'next_admission_reference',
    { p_form_id: formId },
  );

  if (referenceError || !reference) {
    console.error(
      'admission reference allocation failed:',
      referenceError?.message ?? 'no reference returned',
    );
    return { ok: false, error: GENERIC_ERROR, reference: null };
  }

  const { error: insertError } = await supabase.from('admission_submissions').insert({
    reference,
    form_id: formId,
    full_name,
    email,
    phone,
    stream,
    payload,
    verification: verdict.verification,
  });

  if (insertError) {
    // Never log the applicant's answers or contact details — just the failure
    // (the contact action's rule).
    console.error('admission_submissions insert failed:', insertError.message);
    return { ok: false, error: GENERIC_ERROR, reference: null };
  }

  // 6. Notify the office. The DB row is the source of truth: a mail failure
  //    must NOT lose the lead, so notifyOffice swallows its own errors and we
  //    still return success with the reference (PRD 31.3 — a silent
  //    notification failure is the costliest failure in the system, so we log
  //    loudly but never fail the submission).
  await notifyOffice({
    reference: String(reference),
    formId,
    full_name,
    email,
    phone,
    stream,
    payload,
    verification: verdict.verification,
  });

  return { ok: true, error: null, reference: String(reference) };
}

async function notifyOffice(submission: {
  reference: string;
  formId: AdmissionFormId;
  full_name: string;
  email: string;
  phone: string;
  stream: string | null;
  payload: Record<string, string>;
  verification: 'verified' | 'unverified_review';
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  // The Settings page's address when one is configured, otherwise
  // OFFICE_NOTIFICATION_EMAIL. Never read the env var directly here — the
  // office must be able to redirect its mail without a redeploy.
  const to = await getOfficeNotificationEmail();

  if (!apiKey || !from || !to) {
    console.error(
      'Admission notification skipped: missing RESEND_API_KEY, RESEND_FROM, or an office notification address (Settings, or OFFICE_NOTIFICATION_EMAIL).',
    );
    return;
  }

  try {
    const resend = new Resend(apiKey);
    const flag = submission.verification === 'unverified_review' ? ' [unverified_review]' : '';

    // The remaining answers, labelled from the same code schema the form was
    // rendered from, so the office reads "Date of birth", not "date_of_birth".
    const answerLines = Object.entries(submission.payload)
      .map(([key, value]) => `${admissionFieldLabel(submission.formId, key)}: ${value}`)
      .join('\n');

    const { error } = await resend.emails.send({
      from,
      to,
      // Replying goes straight to the applicant — the office's most common next
      // action after reading one of these.
      replyTo: submission.email,
      subject: `New admission application ${submission.reference} — ${ADMISSION_FORM_LABELS[submission.formId]}${flag}`,
      text:
        `Reference: ${submission.reference}\n` +
        `Form: ${ADMISSION_FORM_LABELS[submission.formId]}\n` +
        (submission.stream ? `Stream: ${submission.stream}\n` : '') +
        `Verification: ${submission.verification}\n\n` +
        `Name: ${submission.full_name}\n` +
        `Email: ${submission.email}\n` +
        `Phone: ${submission.phone}\n` +
        `${answerLines}\n\n` +
        `Manage this application in the admin area under Submissions.\n`,
    });
    if (error) {
      console.error('Admission notification email failed:', error);
    }
  } catch (err) {
    console.error('Admission notification email threw:', err);
  }
}
