'use client';

import { useActionState } from 'react';
import { cloudinaryImage } from '@/lib/cloudinary-url';
import { ImageUploadField } from '@/components/admin/image-upload-field';
import { ConfirmSubmitButton } from '@/components/admin/confirm-submit-button';
import {
  addFaculty,
  updateFaculty,
  deleteFaculty,
  moveFaculty,
} from '@/app/admin/programmes/actions';
import { facultyInitial, type ProgrammeFaculty } from '@/lib/programmes';

export type AdminFacultyRow = Pick<
  ProgrammeFaculty,
  'id' | 'name' | 'qualification' | 'photo' | 'display_order'
>;

const actionClass =
  'rounded-sm border border-line px-3 py-1 text-sm font-medium transition-colors hover:bg-green-mist';
const inputClass = 'w-full px-3 py-2 text-sm';

// The circular preview, or an initial-letter stand-in — the same fallback the
// public roster uses, so the admin sees what a photo-less row will look like.
function Avatar({
  name,
  photo,
  cloudName,
}: {
  name: string;
  photo: string | null;
  cloudName: string;
}) {
  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={cloudinaryImage(cloudName, photo, 'c_fill,g_face,ar_1:1,w_160')}
        alt=""
        className="h-14 w-14 shrink-0 rounded-full border border-line object-cover"
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-line bg-green-mist font-display text-h3 text-green-brand"
    >
      {facultyInitial(name)}
    </div>
  );
}

// ONE AT A TIME, deliberately. Gallery photographs are batch-uploaded because
// they are interchangeable files from one event; faculty are distinct people
// with their own name, qualification, and portrait, so there is nothing to
// batch — each row is typed out anyway.
function AddFaculty({
  programmeId,
  facultyCount,
  cloudName,
}: {
  programmeId: string;
  facultyCount: number;
  cloudName: string;
}) {
  const action = addFaculty.bind(null, programmeId);
  const [state, formAction, pending] = useActionState(action, { error: null });

  return (
    <form action={formAction} className="space-y-4 rounded-md border border-line p-4">
      {/* Keyed on the count so a successful add REMOUNTS the fields: the
          uploader clears its stored public ID and the text inputs empty, ready
          for the next person. The count changes because the server action
          revalidates this route, so the parent re-renders with the new list. */}
      <div key={facultyCount} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="new-faculty-name" className="block text-sm font-medium">
              Name
            </label>
            <input
              id="new-faculty-name"
              name="name"
              required
              defaultValue=""
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="new-faculty-qualification"
              className="block text-sm font-medium"
            >
              Qualification <span className="text-ink-faint">(optional)</span>
            </label>
            <input
              id="new-faculty-qualification"
              name="qualification"
              defaultValue=""
              placeholder="M.Sc. Physics"
              className={inputClass}
            />
          </div>
        </div>

        <ImageUploadField
          name="photo"
          purpose="faculty-photo"
          cloudName={cloudName}
          label="Photograph (optional)"
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary text-sm">
        {pending ? 'Adding…' : 'Add faculty member'}
      </button>
    </form>
  );
}

export function ProgrammeFacultySection({
  programmeId,
  faculty,
  cloudName,
}: {
  programmeId: string;
  faculty: AdminFacultyRow[];
  cloudName: string;
}) {
  const lastIndex = faculty.length - 1;

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-display text-h3 text-green-ink">
          Add a faculty member
        </h2>
        <div className="mt-4">
          <AddFaculty
            programmeId={programmeId}
            facultyCount={faculty.length}
            cloudName={cloudName}
          />
        </div>
      </section>

      <section>
        <h2 className="font-display text-h3 text-green-ink">
          Faculty <span className="text-ink-muted">({faculty.length})</span>
        </h2>

        {faculty.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">
            No faculty listed for this programme yet. The programme page will
            simply omit the faculty section until you add someone.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {faculty.map((member, index) => (
              <li
                key={member.id}
                className="rounded-md border border-line p-4"
              >
                {/* Each row is its own form, so saving one person never
                    disturbs anything else on the page. The photograph is part
                    of that form: replacing a portrait is the same edit as
                    correcting a qualification. */}
                <form
                  action={updateFaculty}
                  className="flex flex-wrap items-start gap-4"
                >
                  <input type="hidden" name="id" value={member.id} />
                  <input type="hidden" name="programme_id" value={programmeId} />

                  <Avatar
                    name={member.name}
                    photo={member.photo}
                    cloudName={cloudName}
                  />

                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label
                          htmlFor={`faculty-name-${member.id}`}
                          className="block text-sm font-medium"
                        >
                          Name
                        </label>
                        <input
                          id={`faculty-name-${member.id}`}
                          name="name"
                          required
                          defaultValue={member.name}
                          className={inputClass}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label
                          htmlFor={`faculty-qualification-${member.id}`}
                          className="block text-sm font-medium"
                        >
                          Qualification
                        </label>
                        <input
                          id={`faculty-qualification-${member.id}`}
                          name="qualification"
                          defaultValue={member.qualification ?? ''}
                          placeholder="No qualification listed"
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <ImageUploadField
                      name="photo"
                      purpose="faculty-photo"
                      cloudName={cloudName}
                      initialPublicId={member.photo ?? ''}
                      label="Photograph"
                    />

                    <button type="submit" className={actionClass}>
                      Save changes
                    </button>
                  </div>
                </form>

                {/* Reorder and delete sit OUTSIDE the edit form: they are their
                    own actions, and nesting forms is invalid HTML. */}
                <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-line pt-3">
                  <form action={moveFaculty}>
                    <input type="hidden" name="id" value={member.id} />
                    <input type="hidden" name="programme_id" value={programmeId} />
                    <input type="hidden" name="direction" value="up" />
                    <button
                      type="submit"
                      disabled={index === 0}
                      aria-label={`Move ${member.name} up`}
                      className={`${actionClass} disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent`}
                    >
                      ↑
                    </button>
                  </form>
                  <form action={moveFaculty}>
                    <input type="hidden" name="id" value={member.id} />
                    <input type="hidden" name="programme_id" value={programmeId} />
                    <input type="hidden" name="direction" value="down" />
                    <button
                      type="submit"
                      disabled={index === lastIndex}
                      aria-label={`Move ${member.name} down`}
                      className={`${actionClass} disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent`}
                    >
                      ↓
                    </button>
                  </form>

                  <form action={deleteFaculty} className="ml-auto">
                    <input type="hidden" name="id" value={member.id} />
                    <input type="hidden" name="programme_id" value={programmeId} />
                    <ConfirmSubmitButton
                      confirmText={`Remove ${member.name} from this programme? This cannot be undone.`}
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
