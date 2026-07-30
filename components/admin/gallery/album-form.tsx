'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { ImageUploadField } from '@/components/admin/image-upload-field';
import { slugifyAlbum } from '@/lib/gallery';
import type { AlbumFormState } from '@/app/admin/gallery/actions';

// Mirrors components/admin/news/post-form.tsx — an album has a slug because it
// has a public detail page, so it gets the same auto-slug-from-title behaviour.
// The cover uses the 'gallery-photo' purpose, shared with the album's own
// photographs. display_order is owned by the reorder controls on the list page.
type AlbumInitial = {
  title?: string;
  slug?: string;
  cover_photo?: string | null;
  event_date?: string | null;
  is_published?: boolean;
};

const inputClass = 'w-full px-3 py-2 text-sm';

export function AlbumForm({
  action,
  initial = {},
  cloudName,
  submitLabel = 'Save album',
}: {
  action: (state: AlbumFormState, formData: FormData) => Promise<AlbumFormState>;
  initial?: AlbumInitial;
  cloudName: string;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });

  const [title, setTitle] = useState(initial.title ?? '');
  const [slug, setSlug] = useState(initial.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.slug));

  // Auto-fill the slug from the title until the admin edits it by hand.
  function onTitle(value: string) {
    setTitle(value);
    if (!slugTouched) setSlug(slugifyAlbum(value));
  }

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      <div className="space-y-1.5">
        <label htmlFor="title" className="block text-sm font-medium">
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          value={title}
          onChange={(e) => onTitle(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="slug" className="block text-sm font-medium">
          Slug <span className="text-ink-faint">(web address)</span>
        </label>
        <input
          id="slug"
          name="slug"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
          aria-describedby="slug-hint"
          className={inputClass}
        />
        <p id="slug-hint" className="text-small text-ink-muted">
          /gallery/{slug || 'album'}
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="event_date" className="block text-sm font-medium">
          Event date <span className="text-ink-faint">(optional)</span>
        </label>
        <input
          id="event_date"
          name="event_date"
          type="date"
          defaultValue={initial.event_date ?? ''}
          className={`${inputClass} sm:max-w-xs`}
        />
      </div>

      <ImageUploadField
        name="cover_photo"
        purpose="gallery-photo"
        cloudName={cloudName}
        initialPublicId={initial.cover_photo ?? ''}
        label="Cover image"
      />

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="is_published"
          defaultChecked={initial.is_published ?? false}
          className="h-4 w-4"
        />
        Published (visible to the public)
      </label>

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary text-sm">
          {pending ? 'Saving…' : submitLabel}
        </button>
        <Link
          href="/admin/gallery"
          className="text-sm text-ink-muted hover:text-ink"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
