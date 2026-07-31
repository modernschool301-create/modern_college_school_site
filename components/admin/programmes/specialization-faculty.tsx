'use client';

import { useActionState } from 'react';
import { cloudinaryImage } from '@/lib/cloudinary-url';
import { ImageUploadField } from '@/components/admin/image-upload-field';
import { ConfirmSubmitButton } from '@/components/admin/confirm-submit-button';
import {
  addSpecializationFaculty,
  updateSpecializationFaculty,
  deleteSpecializationFaculty,
  moveSpecializationFaculty,
} from '@/app/admin/programmes/actions';
import { facultyInitial, type SpecializationFaculty } from '@/lib/programmes';

// A specialization's own teaching staff. Deliberately IDENTICAL in shape and
// markup to ProgrammeFacultySection — same one-at-a-time add, same reorder, same
// delete-with-confirm — because it is the same job one level down, and staff who
// have learned one screen should not have to learn the other. It talks to its
// own actions against its own table (see the migration on why the tables are
// mirrored rather than merged).
export type AdminSpecializationFacultyRow = Pick<
  SpecializationFaculty,
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

function AddSpecializationFaculty({
  specializationId,
  facultyCount,
  cloudName,
}: {
  specializationId: string;
  facultyCount: number;
  cloudName: string;
}) {
  const action = addSpecializationFaculty.bind(null, specializationId);
  const [state, formAction, pending] = useActionState(action, { error: null });

  return (
    <form action={formAction} className="space-y-4 rounded-md border border-line p-4">
      {/* Keyed on the count so a successful add REMOUNTS the fields: the
          uploader clears its stored public ID and the text inputs empty, ready
          for the next person. */}
      <div key={facultyCount} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor="new-spec-faculty-name"
              className="block text-sm font-medium"
            >
              Name
            </label>
            <input
              id="new-spec-faculty-name"
              name="name"
              required
              defaultValue=""
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="new-spec-faculty-qualification"
              className="block text-sm font-medium"
            >
              Qualification <span className="text-ink-faint">(optional)</span>
            </label>
            <input
              id="new-spec-faculty-qualification"
              name="qualification"
              defaultValue=""
              placeholder="M.Sc. Computer Science"
              className={inputClass}
            />
          </div>
        </div>

        <ImageUploadField
          name="photo"
          purpose="specialization-faculty-photo"
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

export function SpecializationFacultySection({
  specializationId,
  faculty,
  cloudName,
}: {
  specializationId: string;
  faculty: AdminSpecializationFacultyRow[];
  cloudName: string;
}) {
  const lastIndex = faculty.length - 1;

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-display text-h3 text-green-ink">
          Add a faculty member
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Staff who teach this specialization. They appear on the
          specialization&rsquo;s own page — separately from the parent
          programme&rsquo;s roster.
        </p>
        <div className="mt-4">
          <AddSpecializationFaculty
            specializationId={specializationId}
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
            No faculty listed for this specialization yet. Its page will simply
            omit the faculty section until you add someone.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {faculty.map((member, index) => (
              <li key={member.id} className="rounded-md border border-line p-4">
                {/* Each row is its own form, so saving one person never
                    disturbs anything else on the page. */}
                <form
                  action={updateSpecializationFaculty}
                  className="flex flex-wrap items-start gap-4"
                >
                  <input type="hidden" name="id" value={member.id} />
                  <input
                    type="hidden"
                    name="specialization_id"
                    value={specializationId}
                  />

                  <Avatar
                    name={member.name}
                    photo={member.photo}
                    cloudName={cloudName}
                  />

                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label
                          htmlFor={`spec-faculty-name-${member.id}`}
                          className="block text-sm font-medium"
                        >
                          Name
                        </label>
                        <input
                          id={`spec-faculty-name-${member.id}`}
                          name="name"
                          required
                          defaultValue={member.name}
                          className={inputClass}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label
                          htmlFor={`spec-faculty-qualification-${member.id}`}
                          className="block text-sm font-medium"
                        >
                          Qualification
                        </label>
                        <input
                          id={`spec-faculty-qualification-${member.id}`}
                          name="qualification"
                          defaultValue={member.qualification ?? ''}
                          placeholder="No qualification listed"
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <ImageUploadField
                      name="photo"
                      purpose="specialization-faculty-photo"
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
                  <form action={moveSpecializationFaculty}>
                    <input type="hidden" name="id" value={member.id} />
                    <input
                      type="hidden"
                      name="specialization_id"
                      value={specializationId}
                    />
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
                  <form action={moveSpecializationFaculty}>
                    <input type="hidden" name="id" value={member.id} />
                    <input
                      type="hidden"
                      name="specialization_id"
                      value={specializationId}
                    />
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

                  <form action={deleteSpecializationFaculty} className="ml-auto">
                    <input type="hidden" name="id" value={member.id} />
                    <input
                      type="hidden"
                      name="specialization_id"
                      value={specializationId}
                    />
                    <ConfirmSubmitButton
                      confirmText={`Remove ${member.name} from this specialization? This cannot be undone.`}
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
