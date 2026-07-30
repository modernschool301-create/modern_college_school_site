'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import type { ScholarshipFormState } from '@/app/admin/scholarships/actions';

// Mirrors components/admin/achievements/achievement-form.tsx, minus the image.
// This module has NO media (PRD 8.2), so there is no ImageUploadField, no
// `purpose`, and no cloudName prop anywhere in the Scholarships module — which
// makes this the simplest form in the admin. display_order is owned by the
// reorder controls on the list page, so it is not a field here.
type ScholarshipInitial = {
  title?: string;
  description?: string | null;
  criteria?: string | null;
  is_published?: boolean;
};

const inputClass = 'w-full px-3 py-2 text-sm';

export function ScholarshipForm({
  action,
  initial = {},
}: {
  action: (
    state: ScholarshipFormState,
    formData: FormData,
  ) => Promise<ScholarshipFormState>;
  initial?: ScholarshipInitial;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });

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
          defaultValue={initial.title ?? ''}
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="description" className="block text-sm font-medium">
          Description <span className="text-ink-faint">(Markdown supported)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={10}
          defaultValue={initial.description ?? ''}
          className={`${inputClass} font-mono`}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="criteria" className="block text-sm font-medium">
          Criteria <span className="text-ink-faint">(Markdown supported)</span>
        </label>
        <textarea
          id="criteria"
          name="criteria"
          rows={8}
          defaultValue={initial.criteria ?? ''}
          aria-describedby="criteria-hint"
          className={`${inputClass} font-mono`}
        />
        <p id="criteria-hint" className="text-small text-ink-muted">
          Who can apply. A bulleted list reads best on the public page.
        </p>
      </div>

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
          {pending ? 'Saving…' : 'Save scholarship'}
        </button>
        <Link
          href="/admin/scholarships"
          className="text-sm text-ink-muted hover:text-ink"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
