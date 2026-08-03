import Link from 'next/link';
import { Band } from '@/components/band';
import { Reveal } from '@/components/reveal';

// Evergreen closing call-to-action (PRD 11 — the homepage's bottom conversion
// point). Any admission-season urgency lives in the staff-controlled homepage
// pop-up (PRD Decision 12), never here.
//
// Deliberately COMPACT: this band sits directly above the footer, and a
// full-height marketing section there just pushes the footer off the fold. It
// opts out of `section-y` for roughly half the usual vertical padding, and lays
// out as a row on desktop (message left, action right) so its height is one
// heading tall rather than heading + copy + button stacked.
export function ClosingCTA() {
  return (
    <Band
      tone="forest"
      padded={false}
      className="py-[clamp(2rem,5vw,3rem)]"
      containerClassName="flex flex-col items-center gap-6 text-center md:flex-row md:justify-between md:text-left"
    >
      <Reveal>
        <h2 className="font-display text-h2 text-balance text-white">
          Ready to join Modern College &amp; School?
        </h2>
        <p className="mt-2 text-green-pale">
          Applying takes a few minutes and creates no account.
        </p>
      </Reveal>
      <Reveal className="shrink-0">
        <Link href="/apply" className="btn-primary">
          Apply now
        </Link>
      </Reveal>
    </Band>
  );
}
