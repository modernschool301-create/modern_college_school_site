'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { FileUploadField } from '@/components/admin/file-upload-field';
import {
  DOWNLOAD_CATEGORIES,
  DOWNLOAD_CATEGORY_SINGULAR,
  type DownloadCategory,
} from '@/lib/downloads';
import type { DownloadFormState } from '@/app/admin/downloads/actions';

// Mirrors components/admin/scholarships/scholarship-form.tsx, with the module's
// two additions: a fixed-vocabulary category select and the document uploader.
// It uses FileUploadField, NOT ImageUploadField — the purpose it names
// ('download-file') is the project's first RAW purpose, so the server signs it
// with no ingest transformation and the bytes are stored exactly as uploaded.
// display_order is owned by the reorder controls on the list page, so it is not
// a field here; published_at is server-owned.
type DownloadInitial = {
  title?: string;
  description?: string | null;
  file?: string;
  category?: DownloadCategory;
  is_published?: boolean;
};

const inputClass = 'w-full px-3 py-2 text-sm';

export function DownloadForm({
  action,
  initial = {},
}: {
  action: (
    state: DownloadFormState,
    formData: FormData,
  ) => Promise<DownloadFormState>;
  initial?: DownloadInitial;
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
        <label htmlFor="category" className="block text-sm font-medium">
          Category
        </label>
        <select
          id="category"
          name="category"
          defaultValue={initial.category ?? 'form'}
          className={`${inputClass} sm:max-w-xs`}
        >
          {DOWNLOAD_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {DOWNLOAD_CATEGORY_SINGULAR[c]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="description" className="block text-sm font-medium">
          Description <span className="text-ink-faint">(optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={initial.description ?? ''}
          aria-describedby="description-hint"
          className={inputClass}
        />
        <p id="description-hint" className="text-small text-ink-muted">
          One or two lines telling a visitor what this file contains. Plain text.
        </p>
      </div>

      <FileUploadField
        name="file"
        purpose="download-file"
        initialPublicId={initial.file ?? ''}
        label="File"
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
          {pending ? 'Saving…' : 'Save download'}
        </button>
        <Link
          href="/admin/downloads"
          className="text-sm text-ink-muted hover:text-ink"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
