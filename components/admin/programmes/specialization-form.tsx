'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { ImageUploadField } from '@/components/admin/image-upload-field';
import type { SpecializationFormState } from '@/app/admin/programmes/actions';

// The specialization's own fields, on its own edit screen. Mirrors
// ProgrammeForm, with one deliberate difference: THE SLUG NEVER FOLLOWS THE
// TITLE HERE.
//
// ProgrammeForm auto-fills its slug from the title until the admin touches it,
// which is right for a form that also CREATES rows. This form only ever edits an
// existing specialization — one that already has a public URL at
// /programmes/<programme>/<slug> — so auto-filling would rewrite a live address
// as a side effect of fixing a typo in a title. The slug is a plain controlled
// input, changed only when someone means to change it. The server refuses to
// re-derive it too; the guarantee does not depend on this component.
//
// Faculty are NOT edited here: they live in their own section on the same page,
// the same split the programme editor uses, so saving fields and managing people
// never fight over one submit.
type SpecializationInitial = {
  title?: string;
  slug?: string;
  description?: string | null;
  body?: string | null;
  image?: string | null;
};

const inputClass = 'w-full px-3 py-2 text-sm';

export function SpecializationForm({
  action,
  programmeId,
  programmeSlug,
  initial = {},
  cloudName,
}: {
  action: (
    state: SpecializationFormState,
    formData: FormData,
  ) => Promise<SpecializationFormState>;
  programmeId: string;
  programmeSlug: string;
  initial?: SpecializationInitial;
  cloudName: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const [slug, setSlug] = useState(initial.slug ?? '');

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      {/* The action is bound to the specialization id; the programme id travels
          with the form because the slug's uniqueness is scoped to it. */}
      <input type="hidden" name="programme_id" value={programmeId} />

      <div className="space-y-1.5">
        <label htmlFor="title" className="block text-sm font-medium">
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          defaultValue={initial.title ?? ''}
          aria-describedby="title-hint"
          className={inputClass}
        />
        <p id="title-hint" className="text-small text-ink-muted">
          Renaming this does not change the web address below — existing links
          keep working.
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="slug" className="block text-sm font-medium">
          Slug <span className="text-ink-faint">(web address)</span>
        </label>
        <input
          id="slug"
          name="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          aria-describedby="slug-hint"
          className={inputClass}
        />
        <p id="slug-hint" className="text-small text-ink-muted">
          /programmes/{programmeSlug}/{slug || 'specialization'} — changing this
          moves the page, and any link to the old address will stop working.
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="description" className="block text-sm font-medium">
          Short summary{' '}
          <span className="text-ink-faint">(shown on the programme page)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={initial.description ?? ''}
          aria-describedby="description-hint"
          className={inputClass}
        />
        <p id="description-hint" className="text-small text-ink-muted">
          A sentence or two. It is the card text on the parent programme&rsquo;s
          page and the opening line on this page — plain text, not Markdown.
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
          Shown on this specialization&rsquo;s own page only. Subjects, course
          structure, and approach. Markdown tables are supported and scroll
          sideways on a phone rather than breaking the layout.
        </p>
      </div>

      <ImageUploadField
        name="image"
        purpose="specialization-image"
        cloudName={cloudName}
        initialPublicId={initial.image ?? ''}
        label="Image"
      />

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary text-sm">
          {pending ? 'Saving…' : 'Save specialization'}
        </button>
        <Link
          href={`/admin/programmes/${programmeId}/edit`}
          className="text-sm text-ink-muted hover:text-ink"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
