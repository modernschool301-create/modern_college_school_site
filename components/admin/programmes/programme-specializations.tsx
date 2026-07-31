'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { cloudinaryImage, FILLER_IMAGE } from '@/lib/cloudinary-url';
import { ImageUploadField } from '@/components/admin/image-upload-field';
import { ConfirmSubmitButton } from '@/components/admin/confirm-submit-button';
import {
  addSpecialization,
  deleteSpecialization,
  moveSpecialization,
} from '@/app/admin/programmes/actions';
import type { ProgrammeSpecialization } from '@/lib/programmes';

// A specialization now has its own page content and its own faculty roster, so
// it also has its own EDIT SCREEN. This section is therefore a LIST, not a stack
// of inline forms: adding, reordering, and removing stay here (they are one-
// field or one-button jobs and belong next to the ordering they affect), while
// everything that needs room — slug, markdown body, faculty — lives behind the
// per-row Edit link. Keeping the full editor inline would have put three
// unrelated rosters on one screen.
export type AdminSpecializationRow = Pick<
  ProgrammeSpecialization,
  'id' | 'title' | 'slug' | 'description' | 'image' | 'display_order'
> & { facultyCount: number };

const actionClass =
  'rounded-sm border border-line px-3 py-1 text-sm font-medium transition-colors hover:bg-green-mist';
const inputClass = 'w-full px-3 py-2 text-sm';

// The card thumbnail, at the SAME 4:3 the public card uses — including the
// filler fallback, so an admin sees exactly what a row with no image of its own
// will look like rather than an empty box that appears broken.
function Thumb({
  image,
  cloudName,
}: {
  image: string | null;
  cloudName: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={cloudinaryImage(
        cloudName,
        image ?? FILLER_IMAGE,
        'c_fill,ar_4:3,w_240',
      )}
      alt=""
      className="h-16 w-20 shrink-0 rounded-sm border border-line object-cover"
    />
  );
}

// ONE AT A TIME, like faculty and unlike gallery photographs: a specialization
// is a title, a description, and possibly an image — all typed out, so there is
// nothing to batch.
//
// There is no slug field anywhere on this screen: the slug is derived from the
// title server-side. No page reads it yet, so an editor-facing control for it
// would have no visible effect.
function AddSpecialization({
  programmeId,
  specializationCount,
  cloudName,
}: {
  programmeId: string;
  specializationCount: number;
  cloudName: string;
}) {
  const action = addSpecialization.bind(null, programmeId);
  const [state, formAction, pending] = useActionState(action, { error: null });

  return (
    <form action={formAction} className="space-y-4 rounded-md border border-line p-4">
      {/* Keyed on the count so a successful add REMOUNTS the fields: the
          uploader clears its stored public ID and the text inputs empty, ready
          for the next one. The count changes because the server action
          revalidates this route, so the parent re-renders with the new list. */}
      <div key={specializationCount} className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="new-specialization-title"
            className="block text-sm font-medium"
          >
            Title
          </label>
          <input
            id="new-specialization-title"
            name="title"
            required
            defaultValue=""
            placeholder="Computer Science"
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="new-specialization-description"
            className="block text-sm font-medium"
          >
            Short summary <span className="text-ink-faint">(optional)</span>
          </label>
          <textarea
            id="new-specialization-description"
            name="description"
            rows={3}
            defaultValue=""
            aria-describedby="new-specialization-description-hint"
            className={inputClass}
          />
          <p
            id="new-specialization-description-hint"
            className="text-small text-ink-muted"
          >
            A sentence or two, plain text — the card text on this page. The full
            page content, the web address, and the teaching staff are added on
            the specialization&rsquo;s own screen after it exists.
          </p>
        </div>

        <ImageUploadField
          name="image"
          purpose="specialization-image"
          cloudName={cloudName}
          label="Image (optional)"
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary text-sm">
        {pending ? 'Adding…' : 'Add specialization'}
      </button>
    </form>
  );
}

export function ProgrammeSpecializationsSection({
  programmeId,
  specializations,
  cloudName,
}: {
  programmeId: string;
  specializations: AdminSpecializationRow[];
  cloudName: string;
}) {
  const lastIndex = specializations.length - 1;

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-display text-h3 text-green-ink">
          Add a specialization
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Sub-programmes within this programme — Business Studies or Computer
          Science under +2 Management, for example. Each appears as a card on
          this programme&rsquo;s public page and gets a page of its own.
        </p>
        <div className="mt-4">
          <AddSpecialization
            programmeId={programmeId}
            specializationCount={specializations.length}
            cloudName={cloudName}
          />
        </div>
      </section>

      <section>
        <h2 className="font-display text-h3 text-green-ink">
          Specializations{' '}
          <span className="text-ink-muted">({specializations.length})</span>
        </h2>

        {specializations.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">
            No specializations for this programme yet. The programme page will
            simply omit the section until you add one.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {specializations.map((item, index) => (
              <li key={item.id} className="rounded-md border border-line p-4">
                {/* A summary row, not a form. Everything editable about a
                    specialization now needs room — a markdown body, a slug that
                    is a live URL, a faculty roster — so it lives on its own
                    screen behind this link. */}
                <div className="flex flex-wrap items-start gap-4">
                  <Thumb image={item.image} cloudName={cloudName} />

                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-green-ink">{item.title}</p>
                    <p className="mt-0.5 text-small text-ink-muted">
                      /{item.slug} · {item.facultyCount}{' '}
                      {item.facultyCount === 1 ? 'faculty member' : 'faculty'}
                    </p>
                    {item.description && (
                      <p className="mt-2 line-clamp-2 text-sm text-ink-muted">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <Link
                    href={`/admin/programmes/${programmeId}/specializations/${item.id}/edit`}
                    className={actionClass}
                  >
                    Edit
                  </Link>
                </div>

                {/* Reorder and delete stay HERE: they are one-button actions
                    about this row's place in the list, and the list is the only
                    place the order is visible. */}
                <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-line pt-3">
                  <form action={moveSpecialization}>
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="programme_id" value={programmeId} />
                    <input type="hidden" name="direction" value="up" />
                    <button
                      type="submit"
                      disabled={index === 0}
                      aria-label={`Move ${item.title} up`}
                      className={`${actionClass} disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent`}
                    >
                      ↑
                    </button>
                  </form>
                  <form action={moveSpecialization}>
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="programme_id" value={programmeId} />
                    <input type="hidden" name="direction" value="down" />
                    <button
                      type="submit"
                      disabled={index === lastIndex}
                      aria-label={`Move ${item.title} down`}
                      className={`${actionClass} disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent`}
                    >
                      ↓
                    </button>
                  </form>

                  <form action={deleteSpecialization} className="ml-auto">
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="programme_id" value={programmeId} />
                    <ConfirmSubmitButton
                      confirmText={`Remove ${item.title} from this programme? This cannot be undone.`}
                      className="rounded-sm border border-line px-3 py-1 text-sm font-medium text-danger transition-colors hover:bg-danger-bg"
                    >
                      Delete
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
