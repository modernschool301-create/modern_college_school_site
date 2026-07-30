'use client';

import { useId, useRef, useState } from 'react';
import { cloudinaryImage } from '@/lib/cloudinary-url';
import type { UploadPurpose } from '@/lib/cloudinary-sign';

// Reusable admin cover-image uploader (PRD 10.3). Flow: browser →
// /api/media/sign-upload (states only a PURPOSE) → direct browser→Cloudinary
// upload → stores the returned public_id in a hidden input for the form. Every
// later media-bearing module reuses this.
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB, friendly cap for content images

export function ImageUploadField({
  name,
  purpose,
  cloudName,
  initialPublicId = '',
  label = 'Cover image',
}: {
  name: string;
  purpose: UploadPurpose;
  cloudName: string;
  initialPublicId?: string;
  label?: string;
}) {
  const [publicId, setPublicId] = useState(initialPublicId);
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
      setError('Please choose a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Image must be under 5 MB.');
      return;
    }

    setUploading(true);
    try {
      // 1. Ask our server to sign (it checks admin + fixes the folder).
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
      //    posts and the string that was signed cannot drift apart. The server
      //    OMITS `transformation` for purposes that carry none (raw/PDF), so it
      //    is appended only when present — an empty value would break the
      //    signature, since the signed string then wouldn't contain it.
      const form = new FormData();
      form.append('file', file);
      form.append('api_key', signed.apiKey);
      form.append('timestamp', String(signed.timestamp));
      form.append('folder', signed.folder);
      if (signed.transformation != null) {
        form.append('transformation', signed.transformation);
      }
      form.append('signature', signed.signature);

      // resource_type is a URL path segment, not a signed param — but the SERVER
      // still chooses it per purpose (PRD 10.3), so it comes from the sign
      // response rather than being hardcoded here. Every image purpose sends
      // 'image', so this is the same URL it has always posted to.
      const upRes = await fetch(
        `https://api.cloudinary.com/v1_1/${signed.cloudName}/${signed.resourceType}/upload`,
        { method: 'POST', body: form },
      );
      if (!upRes.ok) throw new Error('upload');
      const data = await upRes.json();
      setPublicId(data.public_id as string);
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  // Preview through a resizing transformation (strips metadata, protects quota).
  const preview = publicId
    ? cloudinaryImage(cloudName, publicId, 'c_fill,ar_16:9,w_640')
    : '';

  const errorId = `${inputId}-error`;

  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium">{label}</span>

      {/* The value the form submits. */}
      <input type="hidden" name={name} value={publicId} />

      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt=""
          className="aspect-video w-full max-w-sm rounded-md border border-line object-cover"
        />
      )}

      {/* The trigger. The native file input is VISUALLY hidden with the sr-only
          clip technique — not display:none / visibility:hidden, which would drop
          it out of the accessibility tree entirely — and the styled <label> is
          the visible affordance. The label carries role="button" + tabIndex so it
          is the single keyboard stop (the input is taken out of the tab order
          with tabIndex={-1}), gets the global --green-signature :focus-visible
          ring, and activates on Enter/Space. A utility action, so §8 Secondary
          (--green-brand border + text), never the rationed --green-signature. */}
      <div>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ACCEPTED.join(',')}
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
            uploading
              ? 'pointer-events-none opacity-60'
              : 'cursor-pointer',
          ].join(' ')}
        >
          {publicId ? 'Replace image' : 'Choose image'}
        </label>
      </div>

      {uploading && (
        <p aria-live="polite" className="text-sm text-ink-muted">
          Uploading…
        </p>
      )}
      {publicId && !uploading && (
        <button
          type="button"
          onClick={() => setPublicId('')}
          className="text-sm text-danger underline"
        >
          Remove image
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
