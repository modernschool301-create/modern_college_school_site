'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { ImageUploadField } from '@/components/admin/image-upload-field';
import type { TestimonialFormState } from '@/app/admin/testimonials/actions';

// PRD §18 frames testimonials as short quotes. This is a SOFT guide surfaced
// while typing — advisory only, never enforced (no blocked submit, no server
// validation, no truncation).
const QUOTE_WORD_GUIDE = 100;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// Mirrors components/admin/achievements/achievement-form.tsx. The quote is plain
// text (rendered verbatim on the public page, NOT markdown), and `programme` is
// free text. display_order is owned by the reorder controls on the list page,
// so it is not a field here.
type TestimonialInitial = {
  student_name?: string;
  programme?: string | null;
  quote?: string;
  photo?: string | null;
  is_published?: boolean;
};

const inputClass = 'w-full px-3 py-2 text-sm';

export function TestimonialForm({
  action,
  initial = {},
  cloudName,
}: {
  action: (
    state: TestimonialFormState,
    formData: FormData,
  ) => Promise<TestimonialFormState>;
  initial?: TestimonialInitial;
  cloudName: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const [quoteWords, setQuoteWords] = useState(() =>
    countWords(initial.quote ?? ''),
  );
  const overGuide = quoteWords > QUOTE_WORD_GUIDE;

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      <div className="space-y-1.5">
        <label htmlFor="student_name" className="block text-sm font-medium">
          Student name
        </label>
        <input
          id="student_name"
          name="student_name"
          required
          defaultValue={initial.student_name ?? ''}
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="programme" className="block text-sm font-medium">
          Programme <span className="text-ink-faint">(optional)</span>
        </label>
        <input
          id="programme"
          name="programme"
          defaultValue={initial.programme ?? ''}
          placeholder="e.g. +2 Science"
          className={`${inputClass} sm:max-w-xs`}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="quote" className="block text-sm font-medium">
          Quote
        </label>
        <textarea
          id="quote"
          name="quote"
          required
          rows={6}
          defaultValue={initial.quote ?? ''}
          onChange={(e) => setQuoteWords(countWords(e.target.value))}
          aria-describedby="quote-word-count"
          className={inputClass}
        />
        <p
          id="quote-word-count"
          aria-live="polite"
          className={`text-small ${overGuide ? 'text-warning' : 'text-ink-muted'}`}
        >
          {quoteWords} of {QUOTE_WORD_GUIDE} words
          {overGuide && ' — longer quotes are harder to read on the page.'}
        </p>
      </div>

      <ImageUploadField
        name="photo"
        purpose="testimonial-photo"
        cloudName={cloudName}
        initialPublicId={initial.photo ?? ''}
        label="Photo"
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
          {pending ? 'Saving…' : 'Save testimonial'}
        </button>
        <Link
          href="/admin/testimonials"
          className="text-sm text-ink-muted hover:text-ink"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
