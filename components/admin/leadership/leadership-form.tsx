'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { ImageUploadField } from '@/components/admin/image-upload-field';
import type { LeadershipFormState } from '@/app/admin/leadership/actions';

// The excerpt is what fits on a homepage card beside two others. This is a SOFT
// guide surfaced while typing — advisory only, never enforced (no blocked
// submit, no server validation, no truncation), the same advisory pattern as
// the testimonial quote counter.
const EXCERPT_WORD_GUIDE = 60;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// Mirrors components/admin/testimonials/testimonial-form.tsx. `title` is free
// text — the school names the role. display_order is owned by the reorder
// controls on the list page, so it is not a field here.
type LeadershipInitial = {
  name?: string;
  title?: string;
  photo?: string | null;
  excerpt?: string;
  full_message?: string | null;
  is_published?: boolean;
};

const inputClass = 'w-full px-3 py-2 text-sm';

export function LeadershipForm({
  action,
  initial = {},
  cloudName,
}: {
  action: (
    state: LeadershipFormState,
    formData: FormData,
  ) => Promise<LeadershipFormState>;
  initial?: LeadershipInitial;
  cloudName: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const [excerptWords, setExcerptWords] = useState(() =>
    countWords(initial.excerpt ?? ''),
  );
  const overGuide = excerptWords > EXCERPT_WORD_GUIDE;

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      <div className="space-y-1.5">
        <label htmlFor="name" className="block text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={initial.name ?? ''}
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="title" className="block text-sm font-medium">
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          defaultValue={initial.title ?? ''}
          placeholder="e.g. Principal"
          aria-describedby="title-help"
          className={inputClass}
        />
        <p id="title-help" className="text-small text-ink-muted">
          Whatever the school calls this role — there is no fixed list.
        </p>
      </div>

      <ImageUploadField
        name="photo"
        purpose="leadership-photo"
        cloudName={cloudName}
        initialPublicId={initial.photo ?? ''}
        label="Photo"
      />

      <div className="space-y-1.5">
        <label htmlFor="excerpt" className="block text-sm font-medium">
          Short statement
        </label>
        <textarea
          id="excerpt"
          name="excerpt"
          required
          rows={4}
          defaultValue={initial.excerpt ?? ''}
          onChange={(e) => setExcerptWords(countWords(e.target.value))}
          aria-describedby="excerpt-word-count"
          className={inputClass}
        />
        <p
          id="excerpt-word-count"
          aria-live="polite"
          className={`text-small ${overGuide ? 'text-warning' : 'text-ink-muted'}`}
        >
          {excerptWords} of {EXCERPT_WORD_GUIDE} words
          {overGuide && ' — longer statements crowd the homepage card.'}
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="full_message" className="block text-sm font-medium">
          Full message <span className="text-ink-faint">(optional)</span>
        </label>
        <textarea
          id="full_message"
          name="full_message"
          rows={12}
          defaultValue={initial.full_message ?? ''}
          aria-describedby="full-message-help"
          className={`${inputClass} font-mono`}
        />
        <p id="full-message-help" className="text-small text-ink-muted">
          Markdown. Leave this empty and the homepage card shows the short
          statement with no &ldquo;Read full message&rdquo; button — there is
          nothing to open.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="is_published"
          defaultChecked={initial.is_published ?? false}
          className="h-4 w-4"
        />
        Published (visible on the homepage)
      </label>

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary text-sm">
          {pending ? 'Saving…' : 'Save message'}
        </button>
        <Link
          href="/admin/leadership"
          className="text-sm text-ink-muted hover:text-ink"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
