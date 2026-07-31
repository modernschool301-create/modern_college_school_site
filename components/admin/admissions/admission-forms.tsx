'use client';

import { useActionState } from 'react';
import {
  updateFormDetails,
  toggleFormPublish,
  toggleAdmissionsPair,
  type AdmissionFormState,
} from '@/app/admin/admissions/actions';
import type { AdmissionForm } from '@/lib/admission-schemas';

// Section A of /admin/admissions (PRD 29). NOT a CRUD list, and shaped so that
// is unmistakable: there is no "Add a form" control and no delete anywhere,
// because the three forms are fixed by the migration's CHECK constraint and by
// the absent INSERT/DELETE policies (Decision 4). Each form is an editable
// BLOCK, closer to the Settings page's groups than to the Programmes list.

const actionClass =
  'rounded-sm border border-line px-3 py-1 text-sm font-medium transition-colors hover:bg-green-mist';
const inputClass = 'w-full px-3 py-2 text-sm';
const initialState: AdmissionFormState = { error: null, saved: false };

function FormBlock({ form }: { form: AdmissionForm }) {
  const action = updateFormDetails.bind(null, form.id);
  const [state, formAction, pending] = useActionState(action, initialState);
  const applyPath = `/apply/${form.id}`;

  return (
    <li className="rounded-md border border-line p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-display text-h3 text-green-ink">{form.title}</h3>
          {/* The public address, shown as a fact an admin can read out or paste
              into a notice — not as a thing to edit. It is the row's primary
              key and cannot change. */}
          <p className="mt-1 font-mono text-small text-ink-muted">{applyPath}</p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={form.is_published ? 'badge badge-neutral' : 'badge badge-warning'}
          >
            {form.is_published ? 'Open' : 'Closed'}
          </span>

          <form action={toggleFormPublish}>
            <input type="hidden" name="form_id" value={form.id} />
            <input
              type="hidden"
              name="publish"
              value={form.is_published ? 'false' : 'true'}
            />
            <button type="submit" className={actionClass}>
              {form.is_published ? 'Close this form' : 'Open this form'}
            </button>
          </form>
        </div>
      </div>

      {/* The view link is always offered, including while the form is closed:
          following it is how an admin sees exactly what a visitor arriving on an
          old link is told. The hint says which of the two they will get. */}
      <p className="mt-3 text-small text-ink-muted">
        <a
          href={applyPath}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-green-brand underline-offset-2 hover:underline"
        >
          View the public page ↗
        </a>{' '}
        {form.is_published
          ? '— live now, and accepting applications.'
          : '— visitors are shown a closed state until this form is open.'}
      </p>

      <form
        action={formAction}
        className="mt-4 space-y-4 border-t border-line pt-4"
      >
        <div className="space-y-1.5">
          <label
            htmlFor={`title-${form.id}`}
            className="block text-sm font-medium"
          >
            Heading
          </label>
          <input
            id={`title-${form.id}`}
            name="title"
            required
            defaultValue={form.title}
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor={`description-${form.id}`}
            className="block text-sm font-medium"
          >
            Description <span className="text-ink-faint">(optional)</span>
          </label>
          <textarea
            id={`description-${form.id}`}
            name="description"
            rows={3}
            defaultValue={form.description ?? ''}
            aria-describedby={`description-hint-${form.id}`}
            className={inputClass}
          />
          <p
            id={`description-hint-${form.id}`}
            className="text-small text-ink-muted"
          >
            A sentence or two, plain text. It appears on the admissions page card
            and again at the top of the form itself. The questions the form asks
            are fixed and are not edited here.
          </p>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor={`deadline-${form.id}`}
            className="block text-sm font-medium"
          >
            Deadline <span className="text-ink-faint">(optional)</span>
          </label>
          <input
            id={`deadline-${form.id}`}
            name="deadline"
            type="date"
            defaultValue={form.deadline ?? ''}
            aria-describedby={`deadline-hint-${form.id}`}
            className={`${inputClass} sm:max-w-xs`}
          />
          <p
            id={`deadline-hint-${form.id}`}
            className="text-small text-ink-muted"
          >
            <strong>Shown as guidance only — nothing enforces it.</strong> An
            application arriving after this date is still accepted and still
            reaches you; a late applicant is a lead, and the office decides, not
            the form. To actually stop taking applications, close the form above.
            Leave blank for no date.
          </p>
        </div>

        {state.error && (
          <p role="alert" className="text-sm text-danger">
            {state.error}
          </p>
        )}
        {state.saved && (
          <p role="status" className="text-sm text-green-brand">
            Saved.
          </p>
        )}

        <button type="submit" disabled={pending} className="btn-primary text-sm">
          {pending ? 'Saving…' : 'Save details'}
        </button>
      </form>
    </li>
  );
}

export function AdmissionFormsSection({ forms }: { forms: AdmissionForm[] }) {
  // The pair's current state decides what the one-click button offers. Both
  // open → offer to close; anything else → offer to open, so the button is
  // always the way OUT of a half-open season.
  const pair = forms.filter(
    (f) => f.id === 'plus_two_management' || f.id === 'plus_two_law',
  );
  const bothOpen = pair.length === 2 && pair.every((f) => f.is_published);
  const someOpen = pair.some((f) => f.is_published);

  return (
    <section>
      <h2 className="font-display text-h3 text-green-ink">Admission forms</h2>
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">
        Three forms, fixed. You control what each one says, whether it is open,
        and an optional deadline — the questions it asks are set in the code, per
        form. Forms are never added or removed here.
      </p>

      {/* THE ONE-CLICK CONVENIENCE (Decision 4). It writes both +2 rows in one
          action and creates no lasting link between them: afterwards each
          form's own button above still moves that form alone, which is what
          lets Law close early when its seats fill while Management stays open.
          BBS is not part of it — a Bachelor intake runs on its own timetable. */}
      <div className="mt-4 rounded-md border border-green-pale bg-green-mist/50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-medium text-green-ink">
              +2 admissions season
            </p>
            <p className="mt-1 max-w-xl text-small text-ink-muted">
              Opens or closes <strong>+2 Management and +2 Law together</strong>,
              since they normally run in the same season. This is a shortcut, not
              a link: each form keeps its own button, so you can still close Law
              early on its own afterwards.
            </p>
          </div>

          <form action={toggleAdmissionsPair}>
            <input type="hidden" name="publish" value={bothOpen ? 'false' : 'true'} />
            <button type="submit" className={actionClass}>
              {bothOpen ? 'Close +2 admissions' : 'Open +2 admissions'}
            </button>
          </form>
        </div>

        {someOpen && !bothOpen && (
          <p className="mt-3 text-small text-ink-muted">
            One of the two is currently open and the other is closed. That is a
            perfectly normal state — opening the season will open both.
          </p>
        )}
      </div>

      <ul className="mt-6 space-y-4">
        {forms.map((form) => (
          <FormBlock key={form.id} form={form} />
        ))}
      </ul>
    </section>
  );
}
