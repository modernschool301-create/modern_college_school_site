'use client';

import { useActionState } from 'react';
import {
  addStream,
  renameStream,
  moveStream,
  toggleStreamAvailability,
  type StreamFormState,
} from '@/app/admin/admissions/actions';
import type { ManagementStreamRow } from '@/lib/admission-schemas';

// Section B of /admin/admissions (PRD 29, Decision 5). The +2 Management form
// asks which stream; this panel owns the options.
//
// ┌─ THERE IS NO DELETE ON THIS SCREEN ───────────────────────────────────────┐
// │ Not hidden — absent, and absent all the way down. There is no delete      │
// │ action in actions.ts, no DELETE policy on management_streams, and no      │
// │ DELETE grant to any role, so a hand-crafted request fails at the database │
// │ too. Retiring is the removal: it drops the stream from the applicant      │
// │ picker at once while every application already made under it keeps its    │
// │ stream label, because a submission stores that as TEXT and not as a       │
// │ foreign key. Hard-deleting would silently rewrite what those applications │
// │ said. The control is therefore worded and coloured as RETIRE / RESTORE —  │
// │ never "Remove", never a bin icon, which would promise something the       │
// │ system deliberately cannot do.                                            │
// └───────────────────────────────────────────────────────────────────────────┘

const actionClass =
  'rounded-sm border border-line px-3 py-1 text-sm font-medium transition-colors hover:bg-green-mist';
const inputClass = 'w-full px-3 py-2 text-sm';
const initialState: StreamFormState = { error: null, saved: false };

function AddStream({ streamCount }: { streamCount: number }) {
  const [state, formAction, pending] = useActionState(addStream, initialState);

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-md border border-line p-4"
    >
      {/* Keyed on the count so a successful add REMOUNTS the field and empties
          it, ready for the next stream. A rejected add keeps what was typed, so
          a name that clashed can be corrected rather than retyped. */}
      <div key={streamCount} className="space-y-1.5">
        <label htmlFor="new-stream-name" className="block text-sm font-medium">
          Stream name
        </label>
        <input
          id="new-stream-name"
          name="name"
          required
          maxLength={120}
          defaultValue=""
          placeholder="Computer Science"
          className={`${inputClass} sm:max-w-sm`}
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.saved && (
        <p role="status" className="text-sm text-green-brand">
          Stream added.
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary text-sm">
        {pending ? 'Adding…' : 'Add stream'}
      </button>
    </form>
  );
}

function StreamRow({
  stream,
  index,
  lastIndex,
}: {
  stream: ManagementStreamRow;
  index: number;
  lastIndex: number;
}) {
  const action = renameStream.bind(null, stream.id);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <li className="rounded-md border border-line p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p
          className={
            stream.is_available
              ? 'min-w-0 font-medium text-green-ink'
              : 'min-w-0 font-medium text-ink-muted'
          }
        >
          {stream.name}
        </p>

        <span
          className={
            stream.is_available
              ? 'badge badge-neutral'
              : 'rounded-full border border-line px-2.5 py-0.5 text-xs font-medium text-ink-muted'
          }
        >
          {stream.is_available ? 'Offered' : 'Retired'}
        </span>
      </div>

      <form
        action={formAction}
        className="mt-3 flex flex-wrap items-end gap-3 border-t border-line pt-3"
      >
        <div className="min-w-0 flex-1 space-y-1.5">
          <label
            htmlFor={`stream-name-${stream.id}`}
            className="block text-sm font-medium"
          >
            Name
          </label>
          <input
            id={`stream-name-${stream.id}`}
            name="name"
            required
            maxLength={120}
            defaultValue={stream.name}
            className={inputClass}
          />
        </div>
        <button type="submit" disabled={pending} className={actionClass}>
          {pending ? 'Saving…' : 'Save name'}
        </button>
      </form>

      {state.error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.saved && (
        <p role="status" className="mt-2 text-sm text-green-brand">
          Saved.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-line pt-3">
        <form action={moveStream}>
          <input type="hidden" name="id" value={stream.id} />
          <input type="hidden" name="direction" value="up" />
          <button
            type="submit"
            disabled={index === 0}
            aria-label={`Move ${stream.name} up`}
            className={`${actionClass} disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent`}
          >
            ↑
          </button>
        </form>
        <form action={moveStream}>
          <input type="hidden" name="id" value={stream.id} />
          <input type="hidden" name="direction" value="down" />
          <button
            type="submit"
            disabled={index === lastIndex}
            aria-label={`Move ${stream.name} down`}
            className={`${actionClass} disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent`}
          >
            ↓
          </button>
        </form>

        {/* RETIRE / RESTORE. Deliberately a plain bordered button in the normal
            palette, not the danger red used for real deletions elsewhere in the
            admin — this is reversible in one click and destroys nothing, and
            dressing it as destructive would misdescribe it. */}
        <form action={toggleStreamAvailability} className="ml-auto">
          <input type="hidden" name="id" value={stream.id} />
          <input
            type="hidden"
            name="available"
            value={stream.is_available ? 'false' : 'true'}
          />
          <button type="submit" className={actionClass}>
            {stream.is_available ? 'Retire' : 'Restore'}
          </button>
        </form>
      </div>
    </li>
  );
}

export function ManagementStreamsSection({
  streams,
}: {
  streams: ManagementStreamRow[];
}) {
  const lastIndex = streams.length - 1;
  const availableCount = streams.filter((s) => s.is_available).length;

  return (
    <section>
      <h2 className="font-display text-h3 text-green-ink">
        Management streams{' '}
        <span className="text-ink-muted">
          ({availableCount} offered
          {streams.length > availableCount
            ? `, ${streams.length - availableCount} retired`
            : ''}
          )
        </span>
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">
        The options in the &ldquo;which stream?&rdquo; picker on the +2
        Management form, in the order shown here. Only this one form reads them.
        Streams are <strong>retired, never deleted</strong> — a retired stream
        leaves the picker immediately, and every application already made under
        it keeps its stream name and stays searchable by it.
      </p>

      <div className="mt-4">
        <AddStream streamCount={streams.length} />
      </div>

      {streams.length === 0 ? (
        <p className="mt-6 text-sm text-ink-muted">
          No streams yet. The list starts empty on purpose — add the streams
          this intake is actually offering before opening the +2 Management
          form.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {streams.map((stream, index) => (
            <StreamRow
              key={stream.id}
              stream={stream}
              index={index}
              lastIndex={lastIndex}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
