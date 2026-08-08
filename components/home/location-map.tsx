'use client';

import { useEffect, useState } from 'react';
import { Band } from '@/components/band';
import { Reveal } from '@/components/reveal';
import { SCHOOL_CONTACT } from '@/lib/contact-details';

// z=17, not 16: in this iframe's wide, short box z=16 spans most of Bhaktapur
// and the pin lands in an unlabelled block. z=17 puts Shrijananagar, the Aniko
// Highway and Sallaghari Ground in frame — the landmarks a visitor actually
// navigates by — without zooming past them.
const MAP_SRC =
  'https://www.google.com/maps?q=27.6745078,85.4051265&z=17&output=embed';

const MAP_REGION_ID = 'home-location-map';

// Matches the collapse transition below; the iframe is unmounted once the
// animation that hides it has finished.
const COLLAPSE_MS = 300;

// Hand-rolled pin, same approach as the footer socials and the nav chevron —
// lucide-react is not a dependency and this doesn't justify adding one.
function PinIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      <path d="M8 14.5s5-4.2 5-8a5 5 0 0 0-10 0c0 3.8 5 8 5 8Z" />
      <circle cx="8" cy="6.5" r="1.9" />
    </svg>
  );
}

export function LocationMap() {
  const [open, setOpen] = useState(false);

  // `mounted` controls whether the iframe EXISTS; `expanded` controls the
  // height animation. They are separate because the two have to happen in
  // sequence — the iframe lands in the DOM at zero height first, then the row
  // grows — and in the reverse order on close, so the map is still visible
  // while it collapses.
  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // Read live rather than at mount: a visitor can change the OS setting
    // between page load and the click.
    const snap = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (open) {
      setMounted(true);
      if (snap) {
        setExpanded(true);
        return;
      }
      // Two frames: the first lets the iframe paint at 0fr, the second flips
      // to 1fr so the browser has a start value to animate FROM. One frame is
      // not enough — React would batch both into the same paint and the row
      // would jump straight to full height.
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setExpanded(true));
      });
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    }

    setExpanded(false);
    if (snap) {
      setMounted(false);
      return;
    }
    // A timer, not `transitionend`: if the section is scrolled out of view or
    // the transition is interrupted, the event may never fire and the iframe
    // would stay mounted forever.
    const timer = window.setTimeout(() => setMounted(false), COLLAPSE_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  return (
    // mist — FeaturesStrip above is paper and ClosingCTA below is forest, so
    // this keeps the homepage's no-two-adjacent-identical-tones rule intact.
    <Band tone="mist">
      <Reveal>
        <p className="text-eyebrow uppercase tracking-wide text-green-brand">
          Find us
        </p>
        <h2 className="mt-2 max-w-2xl font-display text-h2 text-green-ink">
          Visit our campus
        </h2>
        <p className="mt-3 max-w-xl text-ink-muted">{SCHOOL_CONTACT.address}</p>

        <button
          type="button"
          onClick={() => setOpen((wasOpen) => !wasOpen)}
          aria-expanded={open}
          aria-controls={MAP_REGION_ID}
          className="btn-secondary mt-6 gap-2"
        >
          <PinIcon />
          {open ? 'Hide location' : 'Show location'}
        </button>
      </Reveal>

      {/* The 0fr → 1fr grid row is what animates; the iframe keeps its own
          fixed height and is simply clipped. This region stays in the DOM at
          all times so `aria-controls` always resolves to a real element —
          only the iframe inside it comes and goes. */}
      <div
        id={MAP_REGION_ID}
        className={[
          'mt-8 grid transition-[grid-template-rows] duration-300 ease-[var(--ease-soft)] motion-reduce:transition-none',
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        ].join(' ')}
      >
        <div className="min-h-0 overflow-hidden">
          {mounted ? (
            <iframe
              src={MAP_SRC}
              title={"Map showing Modern College & School's location"}
              width="100%"
              height="440"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              // Slightly shorter on phones so the map doesn't fill the whole
              // screen when it opens; the height attribute above is the
              // pre-CSS fallback.
              className="block h-[400px] w-full rounded-md sm:h-[440px]"
            />
          ) : null}
        </div>
      </div>
    </Band>
  );
}
