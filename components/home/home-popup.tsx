'use client';

import { useCallback, useEffect, useState } from 'react';

// Single-image homepage announcement pop-up (PRD Decision 12). Now wired: the
// homepage reads `popup_*` from the settings store and passes them in. This is
// where all time-sensitive messaging (open admissions, intake dates) lives, so
// none of it is ever hardcoded into the hero or sections.
//
// Behaviour: appears a moment after paint, dismissible (button / backdrop /
// Escape), stays dismissed for a few days via a localStorage flag, mobile-first,
// with an optional click-through link wrapping the banner.

const DISMISS_KEY = 'mcs:home-popup:dismissed';
const DISMISS_DAYS = 3;
const APPEAR_DELAY_MS = 1200;

// A dismissal is recorded AGAINST A SPECIFIC BANNER, not against the pop-up.
//
// It used to be a bare timestamp, which meant a visitor who dismissed one
// announcement was blind to the NEXT one for the rest of the window — the school
// could upload an urgent new banner and reach nobody who had seen the old one.
// Storing the image's public ID alongside the expiry fixes that: a dismissal
// only silences the banner it was made against, so a new banner is a new
// announcement to everybody. The three-day window is unchanged.
type Dismissal = { until: number; image: string };

function readDismissal(): Dismissal | null {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Dismissal>;
    if (typeof parsed?.until !== 'number' || typeof parsed?.image !== 'string') {
      return null;
    }
    return { until: parsed.until, image: parsed.image };
  } catch {
    // Unreadable, or the old bare-timestamp format from before this change.
    // Either way: treat it as no dismissal and show the banner. Erring towards
    // showing an announcement once too often beats silencing it.
    return null;
  }
}

export function HomePopup({
  active = false,
  imageUrl,
  imageId = '',
  linkUrl,
  altText = '',
}: {
  active?: boolean;
  imageUrl?: string;
  // The Cloudinary public ID, which identifies WHICH banner this is. Kept
  // separate from imageUrl on purpose: the URL carries a delivery transform, so
  // keying dismissals off it would reset everyone's dismissal the day that
  // transform changed.
  imageId?: string;
  linkUrl?: string;
  altText?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!active || !imageUrl) return;

    // Respect a recent dismissal — but only one recorded against THIS banner.
    const dismissal = readDismissal();
    if (dismissal && dismissal.image === imageId && Date.now() < dismissal.until) {
      return;
    }

    const timer = window.setTimeout(() => setOpen(true), APPEAR_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [active, imageUrl, imageId]);

  const dismiss = useCallback(() => {
    setOpen(false);
    const entry: Dismissal = {
      until: Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000,
      image: imageId,
    };
    try {
      localStorage.setItem(DISMISS_KEY, JSON.stringify(entry));
    } catch {
      // Private mode / storage disabled — a non-persisted dismissal is fine.
    }
  }, [imageId]);

  // Escape to close + lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, dismiss]);

  if (!open || !imageUrl) return null;

  const banner = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl}
      alt={altText}
      className="block h-auto w-full rounded-md"
    />
  );

  return (
    // NO aria-modal. There is no focus trap here and none is wanted — this is a
    // dismissible announcement, not a task the visitor must complete. Claiming
    // aria-modal tells assistive technology that focus is contained when it is
    // not, which is worse than not claiming it: a screen-reader user would be
    // told the rest of the page is inert while their cursor walks straight out
    // of it. role="dialog" + a label + Escape describe what this actually is.
    <div
      role="dialog"
      aria-label="Announcement"
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Dismiss announcement"
        onClick={dismiss}
        className="absolute inset-0 cursor-default bg-green-ink/70"
      />
      {/* The width cap is RESPONSIVE. It used to be a flat max-w-sm (384px),
          which is right on a phone and far too small on a desktop, where the
          banner sat as a stamp in the middle of the screen.
          The step stops at max-w-lg (512px) rather than going wider: the banner
          is portrait or square, so width buys height fast — a 3:4 banner at
          512px is 683px tall and still clears a 768px laptop viewport with the
          ✕ on screen, where an xl (576px) panel would be 768px tall and push it
          off. It also keeps the delivered image (c_limit,w_800 — see
          app/(public)/page.tsx) at ~1.6× the CSS width, so it stays crisp. */}
      <div className="relative z-10 w-full max-w-sm sm:max-w-md md:max-w-lg">
        <button
          type="button"
          aria-label="Close"
          onClick={dismiss}
          className="absolute -right-3 -top-3 flex h-9 w-9 items-center justify-center rounded-full bg-surface text-green-ink shadow-md"
        >
          <span aria-hidden="true" className="text-lg leading-none">
            ✕
          </span>
        </button>

        {linkUrl ? (
          <a href={linkUrl} onClick={dismiss} className="block">
            {banner}
          </a>
        ) : (
          banner
        )}
      </div>
    </div>
  );
}
