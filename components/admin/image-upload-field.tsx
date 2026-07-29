'use client';

import { useState } from 'react';
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

      // 2. Upload straight to Cloudinary with the signed params.
      const form = new FormData();
      form.append('file', file);
      form.append('api_key', signed.apiKey);
      form.append('timestamp', String(signed.timestamp));
      form.append('folder', signed.folder);
      form.append('signature', signed.signature);

      const upRes = await fetch(
        `https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`,
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

      <input
        type="file"
        accept={ACCEPTED.join(',')}
        onChange={handleFile}
        disabled={uploading}
        className="block text-sm"
      />

      {uploading && <p className="text-sm text-ink-muted">Uploading…</p>}
      {publicId && !uploading && (
        <button
          type="button"
          onClick={() => setPublicId('')}
          className="text-sm text-danger underline"
        >
          Remove image
        </button>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
