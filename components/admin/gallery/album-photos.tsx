'use client';

import { useActionState } from 'react';
import { cloudinaryImage } from '@/lib/cloudinary-url';
import { ImageUploadField } from '@/components/admin/image-upload-field';
import { ConfirmSubmitButton } from '@/components/admin/confirm-submit-button';
import {
  addPhoto,
  updatePhotoCaption,
  deletePhoto,
  movePhoto,
} from '@/app/admin/gallery/actions';
import type { GalleryPhoto } from '@/lib/gallery';

export type AdminPhotoRow = Pick<
  GalleryPhoto,
  'id' | 'photo_file' | 'caption' | 'display_order'
>;

const actionClass =
  'rounded-sm border border-line px-3 py-1 text-sm font-medium transition-colors hover:bg-green-mist';
const inputClass = 'w-full px-3 py-2 text-sm';

// ONE PHOTO AT A TIME (PRD 28) — a deliberate simplicity trade, not an
// oversight. Multi-select upload is a pure frontend addition later; nothing in
// the schema, the actions or the policies would need to change for it.
function AddPhoto({
  albumId,
  photoCount,
  cloudName,
}: {
  albumId: string;
  photoCount: number;
  cloudName: string;
}) {
  const action = addPhoto.bind(null, albumId);
  const [state, formAction, pending] = useActionState(action, { error: null });

  return (
    <form action={formAction} className="space-y-4 rounded-md border border-line p-4">
      {/* Keyed on the photo count so a successful add REMOUNTS the fields: the
          uploader clears its stored public ID and the caption empties, ready for
          the next one. The count changes because the server action revalidates
          this route, so the parent re-renders with the new list. */}
      <div key={photoCount} className="space-y-4">
        <ImageUploadField
          name="photo_file"
          purpose="gallery-photo"
          cloudName={cloudName}
          label="Photograph"
        />

        <div className="space-y-1.5">
          <label htmlFor="new-caption" className="block text-sm font-medium">
            Caption <span className="text-ink-faint">(optional)</span>
          </label>
          <input
            id="new-caption"
            name="caption"
            defaultValue=""
            className={inputClass}
          />
        </div>
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary text-sm">
        {pending ? 'Adding…' : 'Add photograph'}
      </button>
    </form>
  );
}

export function AlbumPhotos({
  albumId,
  photos,
  cloudName,
}: {
  albumId: string;
  photos: AdminPhotoRow[];
  cloudName: string;
}) {
  const lastIndex = photos.length - 1;

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-display text-h3 text-green-ink">Add a photograph</h2>
        <div className="mt-4">
          <AddPhoto
            albumId={albumId}
            photoCount={photos.length}
            cloudName={cloudName}
          />
        </div>
      </section>

      <section>
        <h2 className="font-display text-h3 text-green-ink">
          Photographs{' '}
          <span className="text-ink-muted">({photos.length})</span>
        </h2>

        {photos.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">
            No photographs in this album yet. The album will show an empty state
            on the public page until you add some.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line rounded-md border border-line">
            {photos.map((photo, index) => (
              <li key={photo.id} className="flex flex-wrap items-start gap-3 p-4">
                {/* Small square preview: enough to recognise the shot, and a
                    resizing transform rather than the original (Decision 6). */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cloudinaryImage(
                    cloudName,
                    photo.photo_file,
                    'c_fill,ar_1:1,w_160',
                  )}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-sm border border-line object-cover"
                />

                {/* Caption editing is its own small form so saving a caption
                    does not disturb anything else on the page. */}
                <form
                  action={updatePhotoCaption}
                  className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
                >
                  <input type="hidden" name="id" value={photo.id} />
                  <input type="hidden" name="album_id" value={albumId} />
                  <label htmlFor={`caption-${photo.id}`} className="sr-only">
                    Caption for photograph {index + 1}
                  </label>
                  <input
                    id={`caption-${photo.id}`}
                    name="caption"
                    defaultValue={photo.caption ?? ''}
                    placeholder="No caption"
                    className={`${inputClass} min-w-0 flex-1`}
                  />
                  <button type="submit" className={actionClass}>
                    Save caption
                  </button>
                </form>

                <div className="flex items-center gap-1">
                  <form action={movePhoto}>
                    <input type="hidden" name="id" value={photo.id} />
                    <input type="hidden" name="album_id" value={albumId} />
                    <input type="hidden" name="direction" value="up" />
                    <button
                      type="submit"
                      disabled={index === 0}
                      aria-label={`Move photograph ${index + 1} up`}
                      className={`${actionClass} disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent`}
                    >
                      ↑
                    </button>
                  </form>
                  <form action={movePhoto}>
                    <input type="hidden" name="id" value={photo.id} />
                    <input type="hidden" name="album_id" value={albumId} />
                    <input type="hidden" name="direction" value="down" />
                    <button
                      type="submit"
                      disabled={index === lastIndex}
                      aria-label={`Move photograph ${index + 1} down`}
                      className={`${actionClass} disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent`}
                    >
                      ↓
                    </button>
                  </form>
                </div>

                <form action={deletePhoto}>
                  <input type="hidden" name="id" value={photo.id} />
                  <input type="hidden" name="album_id" value={albumId} />
                  <ConfirmSubmitButton
                    confirmText="Delete this photograph? This cannot be undone."
                    className="rounded-sm border border-line px-3 py-1 text-sm font-medium text-danger transition-colors hover:bg-danger-bg"
                  >
                    Delete
                  </ConfirmSubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
