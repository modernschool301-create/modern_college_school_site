'use client';

import { useActionState, useMemo, useState } from 'react';
import { toCsv, downloadCsv } from '@/lib/csv';
import {
  setSubmissionStatus,
  markSubmissionVerified,
  type SubmissionActionState,
} from '@/app/admin/submissions/actions';
import {
  ADMISSION_FORM_LABELS,
  SUBMISSION_STATUSES,
  SUBMISSION_STATUS_LABELS,
  admissionFieldLabel,
  type AdmissionSubmission,
} from '@/lib/admission-schemas';

// The admissions pipeline (PRD 30). Filtering, search, CSV export and the
// expandable detail are all client-side over rows the page already loaded —
// the same shape as every other admin list, and the reason CSV export needs no
// endpoint (lib/csv.ts).

const NPT = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Kathmandu',
});

const selectClass = 'px-2 py-1.5 text-sm';
const actionClass =
  'rounded-sm border border-line px-3 py-1 text-sm font-medium transition-colors hover:bg-green-mist';

const initialActionState: SubmissionActionState = { error: null };

// A per-row status control. Its own component because each row needs its own
// useActionState, and hooks cannot be called inside a map.
function StatusForm({ submission }: { submission: AdmissionSubmission }) {
  const [state, formAction, pending] = useActionState(
    setSubmissionStatus,
    initialActionState,
  );

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="id" value={submission.id} />
      <label htmlFor={`status-${submission.id}`} className="sr-only">
        Status for {submission.reference}
      </label>
      {/* A select, not a next-step button: every status must be reachable from
          every other, because 'archived' is reachable at any point (Decision 8)
          and because a mis-clicked status has to be correctable. */}
      <select
        id={`status-${submission.id}`}
        name="status"
        defaultValue={submission.status}
        className={selectClass}
      >
        {SUBMISSION_STATUSES.map((status) => (
          <option key={status} value={status}>
            {SUBMISSION_STATUS_LABELS[status]}
          </option>
        ))}
      </select>
      <button type="submit" disabled={pending} className={actionClass}>
        {pending ? 'Saving…' : 'Update'}
      </button>
      {state.error && (
        <span role="alert" className="text-xs text-danger">
          {state.error}
        </span>
      )}
    </form>
  );
}

// The one-click dismissal of the fail-open flag (Decision 7a). Sits beside the
// badge so seeing the flag and clearing it are the same glance — the whole
// point is that a flagged row costs staff seconds, not attention.
function VerifyButton({ submission }: { submission: AdmissionSubmission }) {
  const [state, formAction, pending] = useActionState(
    markSubmissionVerified,
    initialActionState,
  );

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="id" value={submission.id} />
      <button
        type="submit"
        disabled={pending}
        className={actionClass}
        aria-label={`Mark ${submission.reference} verified`}
      >
        {pending ? 'Marking…' : 'Mark verified'}
      </button>
      {state.error && (
        <span role="alert" className="text-xs text-danger">
          {state.error}
        </span>
      )}
    </form>
  );
}

export function SubmissionList({
  submissions,
}: {
  submissions: AdmissionSubmission[];
}) {
  const [formFilter, setFormFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [streamFilter, setStreamFilter] = useState('all');
  const [search, setSearch] = useState('');

  // The stream filter's options come from the SUBMISSIONS THEMSELVES, not from
  // management_streams. That is what keeps a retired stream filterable: the
  // stream is stored on each row as text (Decision 5), so a stream the school
  // stopped offering last year still appears here for exactly as long as
  // applications carry it, and disappears on its own once none do.
  const streamOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const submission of submissions) {
      if (submission.stream) seen.add(submission.stream);
    }
    return [...seen].sort((a, b) => a.localeCompare(b));
  }, [submissions]);

  const filtered = useMemo(() => {
    // Search is by REFERENCE (PRD 30.2) — the number an applicant quotes on the
    // phone, which is the search the office actually performs. Case-insensitive
    // and partial, so '42' finds MGMT-2026-00042.
    const query = search.trim().toLowerCase();

    return submissions.filter((submission) => {
      if (formFilter !== 'all' && submission.form_id !== formFilter) return false;
      if (statusFilter !== 'all' && submission.status !== statusFilter) return false;
      if (streamFilter !== 'all' && submission.stream !== streamFilter) return false;
      if (query && !submission.reference.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [submissions, formFilter, statusFilter, streamFilter, search]);

  const flaggedCount = useMemo(
    () => submissions.filter((s) => s.verification === 'unverified_review').length,
    [submissions],
  );

  function exportCsv() {
    const csv = toCsv(
      [
        'Reference',
        'Form',
        'Status',
        'Verification',
        'Name',
        'Email',
        'Phone',
        'Stream',
        'Submitted (NPT)',
        'Answers',
      ],
      filtered.map((s) => [
        s.reference,
        ADMISSION_FORM_LABELS[s.form_id] ?? s.form_id,
        SUBMISSION_STATUS_LABELS[s.status] ?? s.status,
        s.verification,
        s.full_name,
        s.email,
        s.phone,
        s.stream ?? '',
        NPT.format(new Date(s.created_at)),
        // The payload flattened into one labelled cell. A column per answer
        // would differ per form and produce a ragged sheet across the three.
        Object.entries(s.payload ?? {})
          .map(([key, value]) => `${admissionFieldLabel(s.form_id, key)}: ${value}`)
          .join('; '),
      ]),
    );
    downloadCsv('admission-submissions.csv', csv);
  }

  return (
    <div>
      {flaggedCount > 0 && (
        <p className="mb-4 rounded-md border border-line bg-surface p-3 text-sm text-ink-muted">
          <span className="badge badge-warning">unverified · review</span>{' '}
          {flaggedCount} application{flaggedCount === 1 ? '' : 's'} need a quick
          glance. An ambiguous bot check accepted them rather than dropping a
          possible real applicant — confirm each looks genuine and mark it
          verified.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="search-reference" className="sr-only">
          Search by reference
        </label>
        <input
          id="search-reference"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search reference…"
          className="px-3 py-1.5 text-sm"
        />

        <select
          aria-label="Filter by form"
          value={formFilter}
          onChange={(e) => setFormFilter(e.target.value)}
          className={selectClass}
        >
          <option value="all">All forms</option>
          {Object.entries(ADMISSION_FORM_LABELS).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={selectClass}
        >
          <option value="all">All statuses</option>
          {SUBMISSION_STATUSES.map((status) => (
            <option key={status} value={status}>
              {SUBMISSION_STATUS_LABELS[status]}
            </option>
          ))}
        </select>

        {/* Offered only once some application actually carries a stream —
            otherwise it is a filter over nothing. */}
        {streamOptions.length > 0 && (
          <select
            aria-label="Filter by stream"
            value={streamFilter}
            onChange={(e) => setStreamFilter(e.target.value)}
            className={selectClass}
          >
            <option value="all">All streams</option>
            {streamOptions.map((stream) => (
              <option key={stream} value={stream}>
                {stream}
              </option>
            ))}
          </select>
        )}

        <span className="text-sm text-ink-muted">
          {filtered.length} application{filtered.length === 1 ? '' : 's'}
        </span>

        <button type="button" onClick={exportCsv} className={`ml-auto ${actionClass}`}>
          Export CSV
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-6 text-sm text-ink-muted">
          {submissions.length === 0
            ? 'No applications yet. They arrive here as soon as an admission form is published and someone applies.'
            : 'No applications match these filters.'}
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line rounded-md border border-line">
          {filtered.map((submission) => {
            const payloadEntries = Object.entries(submission.payload ?? {});
            return (
              <li key={submission.id} className="p-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      {/* Mono, per design_system.md §3 — this is the number the
                          office reads aloud on the phone. */}
                      <span className="font-mono text-sm text-green-ink" translate="no">
                        {submission.reference}
                      </span>
                      <span className="badge badge-neutral">
                        {ADMISSION_FORM_LABELS[submission.form_id] ??
                          submission.form_id}
                      </span>
                      {submission.stream && (
                        <span className="badge badge-neutral">{submission.stream}</span>
                      )}
                      {submission.verification === 'unverified_review' && (
                        <span className="badge badge-warning">
                          unverified · review
                        </span>
                      )}
                    </p>
                    <p className="mt-1 truncate font-medium text-ink">
                      {submission.full_name}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                      <a
                        href={`tel:${submission.phone}`}
                        className="underline underline-offset-2 hover:text-ink"
                      >
                        {submission.phone}
                      </a>
                      <a
                        href={`mailto:${submission.email}`}
                        className="underline underline-offset-2 hover:text-ink"
                      >
                        {submission.email}
                      </a>
                      <span>{NPT.format(new Date(submission.created_at))}</span>
                    </p>
                  </div>

                  {submission.verification === 'unverified_review' && (
                    <VerifyButton submission={submission} />
                  )}

                  <StatusForm submission={submission} />
                </div>

                {/* The full answers, expandable in place rather than on a detail
                    route: the office triages a list and dips into one row at a
                    time, and a round trip per applicant would slow that down. */}
                {payloadEntries.length > 0 && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs text-ink-muted hover:text-ink">
                      View answers
                    </summary>
                    <dl className="mt-3 grid gap-x-6 gap-y-2 rounded-sm bg-green-mist/50 p-4 text-sm sm:grid-cols-2">
                      {payloadEntries.map(([key, value]) => (
                        <div key={key}>
                          <dt className="text-xs text-ink-muted">
                            {/* Labelled from the form's code schema, so a stored
                                key renders as the question that was asked. */}
                            {admissionFieldLabel(submission.form_id, key)}
                          </dt>
                          <dd className="whitespace-pre-wrap text-ink">
                            {String(value)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
