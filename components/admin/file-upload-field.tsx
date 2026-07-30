'use client';

import { useId, useRef, useState } from 'react';
import type { UploadPurpose } from '@/lib/cloudinary-sign';

// Reusable admin DOCUMENT uploader (PRD 10.3). Deliberately a sibling of
// components/admin/image-upload-field.tsx rather than a mode of it: that one is
// image-specific end to end (thumbnail preview, image MIME allow-list, 5 MB cap)
// and overloading it would make both harder to read. The interaction and the
// styled-label accessibility pattern are identical, so the two feel the same.
//
// Flow is the same as the image field: browser → /api/media/sign-upload (states
// only a PURPOSE) → direct browser→Cloudinary upload → stores the returned
// public_id in a hidden input for the form. What differs is what comes back and
// how it is shown: a document has no meaningful preview, so this reports the
// file's NAME and SIZE instead.
const ACCEPTED = ['application/pdf', 'image/jpeg', 'image/png'];
const ACCEPTED_EXTENSIONS = '.pdf,.jpg,.jpeg,.png';
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB — the PRD 10.3 document cap

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// After a reload the form only knows the stored public ID, not the original
// upload's filename or size. The last path segment of a RAW public ID is the
// stored filename WITH its extension, which is the honest thing to show — size
// is genuinely unknown without an API round-trip, so it is simply omitted
// rather than guessed at.
function nameFromPublicId(publicId: string): string {
  const last = publicId.split('/').pop() ?? publicId;
  return last || publicId;
}

export function FileUploadField({
  name,
  purpose,
  initialPublicId = '',
  label = 'File',
}: {
  name: string;
  purpose: UploadPurpose;
  initialPublicId?: string;
  label?: string;
}) {
  const [publicId, setPublicId] = useState(initialPublicId);
  // Set only by an upload in THIS session; absent when the value was loaded from
  // the database, which is why it is separate from `publicId`.
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(
    null,
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;

    setError('');
    if (!ACCEPTED.includes(file.type)) {
      setError('Please choose a PDF, JPG, or PNG file.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('File must be under 8 MB.');
      return;
    }

    setUploading(true);
    try {
      // 1. Ask our server to sign (it checks admin + fixes the folder, the
      //    resource type, and whether there is an ingest transformation at all).
      const signRes = await fetch('/api/media/sign-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purpose }),
      });
      if (!signRes.ok) throw new Error('sign');
      const signed = await signRes.json();

      // 2. Upload straight to Cloudinary with the signed params. Every signed
      //    param must be echoed EXACTLY as the server hashed it, sent verbatim
      //    from the sign response (never re-typed here) so the string the browser
      //    posts and the string that was signed cannot drift apart.
      //
      //    For THIS purpose the server sends no `transformation` at all — a
      //    document must stay byte-exact — so the conditional below is not
      //    defensive padding, it is the live path: appending an empty
      //    `transformation` would break the signature, because the signed string
      //    would not contain that param.
      const form = new FormData();
      form.append('file', file);
      form.append('api_key', signed.apiKey);
      form.append('timestamp', String(signed.timestamp));
      form.append('folder', signed.folder);
      if (signed.transformation != null) {
        form.append('transformation', signed.transformation);
      }
      form.append('signature', signed.signature);

      // resource_type is a URL path segment and is never signed (Cloudinary
      // excludes it, with file/cloud_name/api_key, from the string to sign), but
      // the SERVER decides it per purpose — 'raw' here, so the bytes are stored
      // as-is with no format detection.
      const upRes = await fetch(
        `https://api.cloudinary.com/v1_1/${signed.cloudName}/${signed.resourceType}/upload`,
        { method: 'POST', body: form },
      );
      if (!upRes.ok) throw new Error('upload');
      const data = await upRes.json();
      setPublicId(data.public_id as string);
      setFileInfo({ name: file.name, size: file.size });
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  const errorId = `${inputId}-error`;

  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium">{label}</span>

      {/* The value the form submits. */}
      <input type="hidden" name={name} value={publicId} />

      {publicId && (
        <p className="flex flex-wrap items-baseline gap-x-2 rounded-md border border-line bg-surface px-3 py-2 text-sm">
          <span aria-hidden="true">📄</span>
          <span className="min-w-0 break-all font-medium text-ink">
            {fileInfo ? fileInfo.name : nameFromPublicId(publicId)}
          </span>
          {fileInfo && (
            <span className="text-ink-muted">{formatSize(fileInfo.size)}</span>
          )}
        </p>
      )}

      {/* The trigger. Identical to ImageUploadField: the native file input is
          VISUALLY hidden with the sr-only clip technique — not display:none /
          visibility:hidden, which would drop it out of the accessibility tree
          entirely — and the styled <label> is the visible affordance. The label
          carries role="button" + tabIndex so it is the single keyboard stop (the
          input is taken out of the tab order with tabIndex={-1}), gets the global
          --green-signature :focus-visible ring, and activates on Enter/Space. A
          utility action, so §8 Secondary (--green-brand border + text), never the
          rationed --green-signature. */}
      <div>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          onChange={handleFile}
          disabled={uploading}
          tabIndex={-1}
          aria-describedby={error ? errorId : undefined}
          className="sr-only"
        />
        <label
          htmlFor={inputId}
          role="button"
          tabIndex={uploading ? -1 : 0}
          aria-disabled={uploading || undefined}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            e.preventDefault(); // Space must not scroll the form
            if (!uploading) inputRef.current?.click();
          }}
          className={[
            'btn-secondary px-4 py-2.5 text-sm',
            uploading ? 'pointer-events-none opacity-60' : 'cursor-pointer',
          ].join(' ')}
        >
          {publicId ? 'Replace file' : 'Choose file'}
        </label>
        <span className="ml-3 text-small text-ink-muted">
          PDF, JPG, or PNG — up to 8 MB
        </span>
      </div>

      {uploading && (
        <p aria-live="polite" className="text-sm text-ink-muted">
          Uploading…
        </p>
      )}
      {publicId && !uploading && (
        <button
          type="button"
          onClick={() => {
            setPublicId('');
            setFileInfo(null);
          }}
          className="text-sm text-danger underline"
        >
          Remove file
        </button>
      )}
      {error && (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
