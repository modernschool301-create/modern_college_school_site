'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { ImageUploadField } from '@/components/admin/image-upload-field';
import {
  PROGRAMME_LEVELS,
  PROGRAMME_LEVEL_LABELS,
  slugifyProgramme,
  type ProgrammeLevel,
} from '@/lib/programmes';
import type { ProgrammeFormState } from '@/app/admin/programmes/actions';

// Mirrors components/admin/gallery/album-form.tsx — a programme has a slug
// because it has a public detail page, so it gets the same auto-slug-from-title
// behaviour. display_order is owned by the reorder controls on the list page.
//
// The faculty rows are NOT edited here: they live in their own section on the
// edit page, the same split Gallery uses for an album's photographs, so saving
// the programme and managing its people never fight over one submit.
type ProgrammeInitial = {
  title?: string;
  slug?: string;
  level?: ProgrammeLevel;
  intro?: string | null;
  body?: string | null;
  cover_image?: string | null;
  is_published?: boolean;
};

const inputClass = 'w-full px-3 py-2 text-sm';

export function ProgrammeForm({
  action,
  initial = {},
  cloudName,
  submitLabel = 'Save programme',
}: {
  action: (
    state: ProgrammeFormState,
    formData: FormData,
  ) => Promise<ProgrammeFormState>;
  initial?: ProgrammeInitial;
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
    if (!slugTouched) setSlug(slugifyProgramme(value));
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
          /programmes/{slug || 'programme'}
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="level" className="block text-sm font-medium">
          Level
        </label>
        <select
          id="level"
          name="level"
          defaultValue={initial.level ?? 'plus_two'}
          className={`${inputClass} sm:max-w-xs`}
        >
          {PROGRAMME_LEVELS.map((level) => (
            <option key={level} value={level}>
              {PROGRAMME_LEVEL_LABELS[level]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="intro" className="block text-sm font-medium">
          Introduction <span className="text-ink-faint">(optional)</span>
        </label>
        <textarea
          id="intro"
          name="intro"
          rows={3}
          defaultValue={initial.intro ?? ''}
          aria-describedby="intro-hint"
          className={inputClass}
        />
        <p id="intro-hint" className="text-small text-ink-muted">
          A short standfirst. Shown on the programmes list and above the full
          description — plain text, not Markdown.
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="body" className="block text-sm font-medium">
          Full description{' '}
          <span className="text-ink-faint">(Markdown supported)</span>
        </label>
        <textarea
          id="body"
          name="body"
          rows={18}
          defaultValue={initial.body ?? ''}
          aria-describedby="body-hint"
          className={`${inputClass} font-mono`}
        />
        <p id="body-hint" className="text-small text-ink-muted">
          Curriculum and subject tables, activities, and teaching approach.
          Markdown tables are supported and scroll sideways on a phone rather
          than breaking the layout.
        </p>
      </div>

      <ImageUploadField
        name="cover_image"
        purpose="programme-cover"
        cloudName={cloudName}
        initialPublicId={initial.cover_image ?? ''}
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
          href="/admin/programmes"
          className="text-sm text-ink-muted hover:text-ink"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
