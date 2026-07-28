'use client';

import { useCallback, useEffect, useState } from 'react';

// Single-image homepage announcement pop-up (PRD Decision 12). This is the
// SHELL only: it renders nothing until settings provide `active` + an image
// (that wiring lands with the Settings module — see the page's TODO). This is
// where all time-sensitive messaging (open admissions, intake dates) will live,
// so none of it is ever hardcoded into the hero or sections.
//
// Behaviour: appears a moment after paint, dismissible (button / backdrop /
// Escape), stays dismissed for a few days via a localStorage flag, mobile-first,
// with an optional click-through link wrapping the banner.

const DISMISS_KEY = 'mcs:home-popup:dismissed-until';
const DISMISS_DAYS = 3;
const APPEAR_DELAY_MS = 1200;

export function HomePopup({
  active = false,
  imageUrl,
  linkUrl,
  altText = '',
}: {
  active?: boolean;
  imageUrl?: string;
  linkUrl?: string;
  altText?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!active || !imageUrl) return;

    // Respect a recent dismissal.
    const until = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    if (Date.now() < until) return;

    const timer = window.setTimeout(() => setOpen(true), APPEAR_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [active, imageUrl]);

  const dismiss = useCallback(() => {
    setOpen(false);
    const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
    try {
      localStorage.setItem(DISMISS_KEY, String(until));
    } catch {
      // Private mode / storage disabled — a non-persisted dismissal is fine.
    }
  }, []);

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
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Announcement"
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Dismiss announcement"
        onClick={dismiss}
        className="absolute inset-0 cursor-default bg-green-ink/70"
      />
      <div className="relative z-10 w-full max-w-sm">
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
