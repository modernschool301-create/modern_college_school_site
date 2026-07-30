'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { ImageUploadField } from '@/components/admin/image-upload-field';
import type { AchievementFormState } from '@/app/admin/achievements/actions';

// Mirrors components/admin/news/post-form.tsx. No slug here (achievements have
// no detail page) and no display_order (that is owned by the reorder controls on
// the list page), which keeps this the simplest form in the admin.
type AchievementInitial = {
  title?: string;
  description?: string | null;
  image?: string | null;
  achieved_on?: string | null;
  is_published?: boolean;
};

const inputClass = 'w-full px-3 py-2 text-sm';

export function AchievementForm({
  action,
  initial = {},
  cloudName,
}: {
  action: (
    state: AchievementFormState,
    formData: FormData,
  ) => Promise<AchievementFormState>;
  initial?: AchievementInitial;
  cloudName: string;
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
        <label htmlFor="achieved_on" className="block text-sm font-medium">
          Date achieved <span className="text-ink-faint">(optional)</span>
        </label>
        <input
          id="achieved_on"
          name="achieved_on"
          type="date"
          defaultValue={initial.achieved_on ?? ''}
          className={`${inputClass} sm:max-w-xs`}
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

      <ImageUploadField
        name="image"
        purpose="achievement-image"
        cloudName={cloudName}
        initialPublicId={initial.image ?? ''}
        label="Image"
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
          {pending ? 'Saving…' : 'Save achievement'}
        </button>
        <Link
          href="/admin/achievements"
          className="text-sm text-ink-muted hover:text-ink"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
