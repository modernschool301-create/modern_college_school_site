'use client';

import { useActionState, useEffect, useState } from 'react';
import Link from 'next/link';
import { submitAdmission, type ApplyState } from './actions';
import {
  ADMISSION_BASELINE_FIELDS,
  ADMISSION_EXTRA_FIELDS,
  formRequiresStream,
  type AdmissionField,
  type AdmissionFormId,
  type ManagementStream,
} from '@/lib/admission-schemas';

// The applicant-facing form. It renders from the SAME code schema the server
// validates against (lib/admission-schemas.ts), so a field cannot be asked
// without being validated or validated without being asked.
//
// CLIENT VALIDATION IS FRIENDLY AND PERMISSIVE (PRD 21.1.3). Only `required`
// and `maxLength` are set — no pattern attributes, no phone or GPA format
// checks, and `noValidate` on the form so the browser's own bubbles do not
// second-guess an unusual but real answer. The server applies the same thin
// checks. Never block a real applicant over formatting (PRD 34).

const initialState: ApplyState = { ok: false, error: null, reference: null };

const fieldClass = 'w-full px-3 py-2 text-sm';

function Field({ field }: { field: AdmissionField }) {
  const hintId = field.hint ? `${field.name}-hint` : undefined;

  return (
    <div className="space-y-1.5">
      <label htmlFor={field.name} className="block text-sm font-medium text-ink">
        {field.label}
      </label>

      {field.type === 'select' ? (
        <select
          id={field.name}
          name={field.name}
          required
          defaultValue=""
          aria-describedby={hintId}
          className={fieldClass}
        >
          <option value="" disabled>
            Choose one
          </option>
          {field.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : field.type === 'textarea' ? (
        <textarea
          id={field.name}
          name={field.name}
          required
          rows={3}
          maxLength={field.maxLength}
          autoComplete={field.autoComplete}
          aria-describedby={hintId}
          className={fieldClass}
        />
      ) : (
        <input
          id={field.name}
          name={field.name}
          type={field.type}
          required
          maxLength={field.maxLength}
          autoComplete={field.autoComplete}
          aria-describedby={hintId}
          className={fieldClass}
        />
      )}

      {field.hint && (
        <p id={hintId} className="text-xs text-ink-muted">
          {field.hint}
        </p>
      )}
    </div>
  );
}

export function ApplyForm({
  formId,
  streams,
}: {
  formId: AdmissionFormId;
  // Available streams, already filtered and ordered by the page. Empty only for
  // the non-Management forms — a published Management form with no available
  // streams never reaches this component (the page shows "opening soon"
  // instead, Decision 5).
  streams: ManagementStream[];
}) {
  const [state, formAction, pending] = useActionState(submitAdmission, initialState);

  // Timing trap: stamp the client's render time on mount. Empty during SSR /
  // before hydration, which the server treats as ambiguous (fail-open), never
  // as a bot (see lib/bot-protection.ts).
  const [renderedAt, setRenderedAt] = useState('');
  useEffect(() => {
    setRenderedAt(String(Date.now()));
  }, []);

  if (state.ok && state.reference) {
    return (
      <div
        role="status"
        className="mt-10 rounded-lg border border-green-pale bg-green-mist p-8 sm:p-10"
      >
        <p className="font-display text-h3 text-green-ink">
          Your application has been received
        </p>

        {/* THE REFERENCE, given the most prominent treatment on the page. With
            no public accounts there is no "track your application" screen — this
            number, quoted on the phone, is the entire retrieval mechanism
            (Decision 8), so it must survive being read off a screen, written on
            paper, and repeated aloud. Mono face per design_system.md §3, which
            names reference numbers as its use. */}
        <p className="mt-6 text-eyebrow uppercase tracking-wide text-green-brand">
          Your reference number
        </p>
        <p className="mt-1 font-mono text-h2 text-green-ink" translate="no">
          {state.reference}
        </p>

        <p className="mt-6 max-w-xl text-ink-muted">
          Please keep this number — quote it when you contact the admissions
          office. Someone from the office will be in touch with you about the
          next steps.
        </p>

        <Link href="/admissions" className="btn-secondary mt-6 text-sm">
          Back to admissions
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-10 max-w-2xl" noValidate>
      <input type="hidden" name="form_id" value={formId} readOnly />

      {/* Honeypot: hidden from humans and assistive tech, filled only by naive
          bots. aria-hidden + tabIndex=-1 + autoComplete=off keep screen readers
          and password managers away so a real applicant is never flagged. The
          decoy name differs from the contact form's on purpose. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '-9999px',
          width: 1,
          height: 1,
          overflow: 'hidden',
        }}
      >
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {/* Timing trap value. */}
      <input type="hidden" name="rendered_at" value={renderedAt} readOnly />

      <fieldset className="space-y-5 border-0 p-0">
        <legend className="text-eyebrow uppercase tracking-wide text-green-brand">
          Your details
        </legend>
        {ADMISSION_BASELINE_FIELDS.map((field) => (
          <Field key={field.name} field={field} />
        ))}
      </fieldset>

      <fieldset className="mt-10 space-y-5 border-0 p-0">
        <legend className="text-eyebrow uppercase tracking-wide text-green-brand">
          Your studies
        </legend>

        {/* The stream picker (Management only). Submits the stream's ID, which
            the server resolves to a name and stores as TEXT — so retiring a
            stream later never rewrites this application (Decision 5). */}
        {formRequiresStream(formId) && (
          <div className="space-y-1.5">
            <label htmlFor="stream_id" className="block text-sm font-medium text-ink">
              Which stream do you want to join?
            </label>
            <select
              id="stream_id"
              name="stream_id"
              required
              defaultValue=""
              className={fieldClass}
            >
              <option value="" disabled>
                Choose a stream
              </option>
              {streams.map((stream) => (
                <option key={stream.id} value={stream.id}>
                  {stream.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {ADMISSION_EXTRA_FIELDS[formId].map((field) => (
          <Field key={field.name} field={field} />
        ))}
      </fieldset>

      {state.error && (
        <p role="alert" className="mt-6 text-sm text-danger">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary mt-8 text-sm">
        {pending ? 'Sending…' : 'Submit application'}
      </button>
    </form>
  );
}
