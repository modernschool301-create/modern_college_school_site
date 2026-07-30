'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cloudinaryImage } from '@/lib/cloudinary-url';

// The album photo grid and its full-screen viewer (PRD 20).
//
// Built on the NATIVE <dialog> + showModal(), not a hand-rolled overlay: the
// browser then owns the focus trap, the top layer (so nothing can paint over
// it), inertness of the page behind, and Escape-to-close. Hand-rolling those
// correctly is a lot of code that the platform already ships — the only focus
// work left here is RESTORING it on close, which is done explicitly rather than
// relying on the browser, because the grid re-renders underneath.
//
// Photographs keep their own proportions: the grid is CSS columns and the images
// are delivered through `c_limit` (a bounding box that only ever shrinks), never
// `c_fill`, which would crop every shot to one ratio. Delivery always goes
// through a resizing transform, never the raw original (Decision 6) — that also
// strips the location metadata a camera writes into the file.

export type LightboxPhoto = {
  id: string;
  photo_file: string;
  caption: string | null;
};

// Eagerly load only what is plausibly above the fold; the rest lazy-load.
const EAGER_COUNT = 3;

export function PhotoLightbox({
  photos,
  cloudName,
}: {
  photos: LightboxPhoto[];
  cloudName: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // The thumbnail that OPENED the viewer. Focus returns here on close even if
  // the arrow keys have moved on to a different photograph, so a keyboard user
  // lands back where they left the grid.
  const triggerIndexRef = useRef(0);

  // State drives the dialog rather than the other way round: showModal()/close()
  // are imperative, so they are reconciled here in one place.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (openIndex !== null && !dialog.open) dialog.showModal();
    else if (openIndex === null && dialog.open) dialog.close();
  }, [openIndex]);

  // The single close path. The native `close` event fires for Escape, for the
  // close button, and for a backdrop click alike, so focus restoration lives
  // here once instead of at three call sites.
  const handleClose = useCallback(() => {
    setOpenIndex(null);
    thumbRefs.current[triggerIndexRef.current]?.focus();
  }, []);

  function openAt(index: number) {
    triggerIndexRef.current = index;
    setOpenIndex(index);
  }

  // Clamped, not wrapping: at the last photograph the right arrow does nothing
  // and the Next button is disabled, so the viewer's position is always obvious.
  function step(delta: number) {
    setOpenIndex((current) => {
      if (current === null) return null;
      const next = current + delta;
      if (next < 0 || next > photos.length - 1) return current;
      return next;
    });
  }

  function onDialogKeyDown(e: React.KeyboardEvent<HTMLDialogElement>) {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      step(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      step(-1);
    }
    // Escape is left to the browser: <dialog> handles it and fires `close`.
  }

  const current = openIndex === null ? null : photos[openIndex];

  return (
    <>
      {/* CSS columns, not a grid: every photograph keeps its own aspect ratio
          instead of being cropped into a uniform cell. break-inside-avoid stops
          an image being split across a column boundary. */}
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [column-fill:_balance]">
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            type="button"
            ref={(el) => {
              thumbRefs.current[index] = el;
            }}
            onClick={() => openAt(index)}
            // The image is decorative so the announcement is not doubled; the
            // BUTTON carries the accessible name. A caption is the best name
            // available, and where there is none the position is at least
            // unambiguous.
            aria-label={
              photo.caption ?? `Photograph ${index + 1} of ${photos.length}`
            }
            className="mb-4 block w-full cursor-zoom-in overflow-hidden rounded-md border border-line bg-surface break-inside-avoid transition-colors hover:border-green-pale"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cloudinaryImage(cloudName, photo.photo_file, 'c_limit,w_800')}
              alt=""
              loading={index < EAGER_COUNT ? 'eager' : 'lazy'}
              className="block w-full"
            />
            {photo.caption && (
              <span className="block px-4 py-3 text-left text-small text-ink-muted">
                {photo.caption}
              </span>
            )}
          </button>
        ))}
      </div>

      <dialog
        ref={dialogRef}
        onClose={handleClose}
        onKeyDown={onDialogKeyDown}
        // A click that lands on the dialog element itself is a click on the
        // backdrop area — the content below stops propagation by being a child.
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close();
        }}
        aria-label={
          current
            ? (current.caption ??
              `Photograph ${(openIndex ?? 0) + 1} of ${photos.length}`)
            : undefined
        }
        className="lightbox"
      >
        {current && (
          <div className="flex h-full w-full flex-col">
            <div className="flex items-center justify-between gap-4 p-4">
              <p className="text-small text-paper/80">
                {(openIndex ?? 0) + 1} of {photos.length}
              </p>
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="rounded-sm border border-paper/40 px-3 py-1.5 text-sm font-medium text-paper transition-colors hover:bg-paper/10"
              >
                Close
              </button>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center px-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cloudinaryImage(
                  cloudName,
                  current.photo_file,
                  'c_limit,w_1600',
                )}
                alt={current.caption ?? ''}
                className="max-h-full max-w-full object-contain"
              />
            </div>

            <div className="flex items-center justify-between gap-4 p-4">
              <button
                type="button"
                onClick={() => step(-1)}
                disabled={openIndex === 0}
                className="rounded-sm border border-paper/40 px-3 py-1.5 text-sm font-medium text-paper transition-colors hover:bg-paper/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
              >
                ← Previous
              </button>

              {/* aria-live so arrowing through the album announces the new
                  caption to a screen reader — the dialog's own label is only
                  read once, when it opens. */}
              <p
                aria-live="polite"
                className="min-w-0 flex-1 text-center text-small text-paper/90"
              >
                {current.caption}
              </p>

              <button
                type="button"
                onClick={() => step(1)}
                disabled={openIndex === photos.length - 1}
                className="rounded-sm border border-paper/40 px-3 py-1.5 text-sm font-medium text-paper transition-colors hover:bg-paper/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
