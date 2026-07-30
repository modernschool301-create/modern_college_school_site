'use client';

import { useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addPhoto, finishPhotoBatch } from '@/app/admin/gallery/actions';

// Multi-file uploader for album photographs. A real event album is 15–30 shots,
// so one-at-a-time is not a workable pace — but the batch is deliberately NOT
// all-or-nothing: each file is pre-checked, uploaded, and recorded on its own,
// and a file that fails is skipped and named while the rest carry on.
//
// The loop is SEQUENTIAL by design. Twenty parallel uploads from one browser
// invite Cloudinary rate limiting, and when something does fail in a parallel
// fan-out it is much harder to say which file it was. One at a time is slower
// and legible.
//
// Same signing flow as ImageUploadField (PRD 10.3): the browser states only a
// purpose, the server picks the folder and delivery type and signs.
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB — matches ImageUploadField's cap

type Skipped = { name: string; reason: string };
type Summary = { added: number; skipped: Skipped[] };
type Progress = { current: number; total: number; name: string };

type UploadOutcome =
  | { status: 'ok'; publicId: string }
  | { status: 'failed'; reason: string }
  // The admin was deactivated or demoted mid-batch. Every remaining file would
  // fail the same way, so the batch stops rather than listing twenty identical
  // failures.
  | { status: 'unauthorized' };

// One file, browser → our signer → Cloudinary. Returns a reason instead of
// throwing so the caller can put it straight into the skipped list.
async function uploadToCloudinary(file: File): Promise<UploadOutcome> {
  let signed: {
    apiKey: string;
    timestamp: number;
    folder: string;
    transformation?: string | null;
    signature: string;
    cloudName: string;
    resourceType: string;
  };

  try {
    const signRes = await fetch('/api/media/sign-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purpose: 'gallery-photo' }),
    });
    // 401 = no session, 403 = session but no longer an active admin. The route
    // reads the role live from the database, so this is the deactivation biting.
    if (signRes.status === 401 || signRes.status === 403) {
      return { status: 'unauthorized' };
    }
    if (!signRes.ok) {
      return { status: 'failed', reason: 'The upload could not be authorized.' };
    }
    signed = await signRes.json();
  } catch {
    return { status: 'failed', reason: 'The upload could not be authorized.' };
  }

  try {
    // Every signed param is echoed EXACTLY as the server hashed it, sent verbatim
    // from the sign response, so the posted string and the signed string cannot
    // drift apart. `transformation` is appended only when present — an empty
    // value would break a signature that never included it.
    const form = new FormData();
    form.append('file', file);
    form.append('api_key', signed.apiKey);
    form.append('timestamp', String(signed.timestamp));
    form.append('folder', signed.folder);
    if (signed.transformation != null) {
      form.append('transformation', signed.transformation);
    }
    form.append('signature', signed.signature);

    const upRes = await fetch(
      `https://api.cloudinary.com/v1_1/${signed.cloudName}/${signed.resourceType}/upload`,
      { method: 'POST', body: form },
    );
    if (!upRes.ok) {
      return { status: 'failed', reason: 'Cloudinary would not accept this file.' };
    }
    const data = await upRes.json();
    const publicId = data?.public_id;
    if (typeof publicId !== 'string' || !publicId) {
      return { status: 'failed', reason: 'The upload came back without an image id.' };
    }
    return { status: 'ok', publicId };
  } catch {
    return { status: 'failed', reason: 'The upload did not finish.' };
  }
}

export function PhotoBatchUpload({ albumId }: { albumId: string }) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const router = useRouter();

  async function runBatch(files: File[]) {
    // The previous summary stays on screen until a new batch begins — staff need
    // to read which files failed, so it is never a toast and never auto-clears.
    setSummary(null);
    setRunning(true);
    setProgress({ current: 1, total: files.length, name: files[0].name });

    let added = 0;
    const skipped: Skipped[] = [];
    let stopped = false;

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      setProgress({ current: i + 1, total: files.length, name: file.name });

      // Pre-checks first: a file that cannot possibly succeed is skipped without
      // spending a signature request on it.
      if (!ACCEPTED.includes(file.type)) {
        skipped.push({ name: file.name, reason: 'Not a JPG, PNG, or WebP image.' });
        continue;
      }
      if (file.size > MAX_BYTES) {
        skipped.push({ name: file.name, reason: 'Larger than 5 MB.' });
        continue;
      }

      const uploaded = await uploadToCloudinary(file);
      if (uploaded.status === 'unauthorized') {
        stopped = true;
        break;
      }
      if (uploaded.status === 'failed') {
        skipped.push({ name: file.name, reason: uploaded.reason });
        continue;
      }

      let ok = false;
      let reason = 'Could not be saved to the album.';
      try {
        const result = await addPhoto(albumId, uploaded.publicId);
        if (result.ok) ok = true;
        else reason = result.error;
      } catch {
        // The action redirects a deactivated admin to /login, which surfaces
        // here as a rejected call. Nothing useful to report — the navigation is
        // the answer.
        stopped = true;
        break;
      }

      if (ok) added += 1;
      else skipped.push({ name: file.name, reason });
    }

    // One revalidation for the whole batch (see finishPhotoBatch), then a
    // refresh so this page's photo grid picks up the new rows.
    if (added > 0) {
      await finishPhotoBatch(albumId).catch(() => {});
      router.refresh();
    }

    setProgress(null);
    setRunning(false);

    if (stopped) {
      // Session/role problem: the sign route or the action has already sent the
      // browser to /login. Don't paint a misleading summary over it.
      router.push('/login');
      return;
    }
    setSummary({ added, skipped });
  }

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ''; // allow re-selecting the same files later
    if (files.length === 0) return;
    void runBatch(files);
  }

  const percent = progress
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  return (
    <div className="space-y-4 rounded-md border border-line p-4">
      <div className="space-y-1">
        <span className="block text-sm font-medium">Photographs</span>
        <p className="text-sm text-ink-muted">
          Choose as many as you like — JPG, PNG, or WebP, up to 5 MB each. They
          are added in the order you select them, and you can add more to this
          album at any time.
        </p>
      </div>

      {/* Same trigger pattern as ImageUploadField: the native input is visually
          hidden with the sr-only clip technique (not display:none, which would
          drop it out of the accessibility tree) and the styled <label> is the
          visible affordance. The label carries role="button" + tabIndex so it is
          the single keyboard stop, gets the global --green-signature
          :focus-visible ring, and activates on Enter/Space. A utility action, so
          §8 Secondary — never the rationed signature green. */}
      <div>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple
          accept={ACCEPTED.join(',')}
          onChange={handleFiles}
          disabled={running}
          tabIndex={-1}
          className="sr-only"
        />
        <label
          htmlFor={inputId}
          role="button"
          tabIndex={running ? -1 : 0}
          aria-disabled={running || undefined}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            e.preventDefault(); // Space must not scroll the page
            if (!running) inputRef.current?.click();
          }}
          className={[
            'btn-secondary px-4 py-2.5 text-sm',
            running ? 'pointer-events-none opacity-60' : 'cursor-pointer',
          ].join(' ')}
        >
          Choose photos
        </label>
      </div>

      {/* Progress. A twenty-photo batch takes real time, and silence reads as a
          hang — so the count, the filename, and a bar are all on screen. */}
      {progress && (
        <div className="space-y-2">
          <p aria-live="polite" className="text-sm text-ink-muted">
            Uploading {progress.current} of {progress.total}…{' '}
            <span className="text-ink">{progress.name}</span>
          </p>
          <div
            role="progressbar"
            aria-label="Photograph upload progress"
            aria-valuemin={0}
            aria-valuemax={progress.total}
            aria-valuenow={progress.current}
            className="h-2 w-full overflow-hidden rounded-full bg-green-mist"
          >
            <div
              className="h-full rounded-full bg-green-brand transition-[width] duration-200 ease-out motion-reduce:transition-none"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}

      {/* The result summary PERSISTS — it is the only place the staff member can
          read which files did not make it, so it must survive long enough to be
          acted on. It clears when the next batch starts, not on a timer. */}
      {summary && !running && (
        <div
          role="status"
          className="rounded-md border border-line bg-green-mist p-4 text-sm"
        >
          <p className="font-medium text-green-ink">
            {summary.added} {summary.added === 1 ? 'photo' : 'photos'} added.
            {summary.skipped.length > 0 && ` ${summary.skipped.length} skipped.`}
          </p>

          {summary.skipped.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {summary.skipped.map((item, i) => (
                <li key={`${item.name}-${i}`} className="text-ink-muted">
                  <span className="font-medium text-danger">{item.name}</span>{' '}
                  — {item.reason}
                </li>
              ))}
            </ul>
          )}

          {summary.added === 0 && summary.skipped.length === 0 && (
            <p className="mt-1 text-ink-muted">Nothing to add.</p>
          )}
        </div>
      )}
    </div>
  );
}
