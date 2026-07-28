import Link from 'next/link';
import { Band } from '@/components/band';
import { Reveal } from '@/components/reveal';

// Evergreen closing call-to-action. Any admission-season urgency lives in the
// staff-controlled homepage pop-up (PRD Decision 12), never here.
export function ClosingCTA() {
  return (
    <Band tone="forest" className="text-center">
      <Reveal className="mx-auto flex max-w-2xl flex-col items-center">
        <h2 className="font-display text-h2 text-white">
          Ready to join Modern College &amp; School?
        </h2>
        <p className="mt-4 text-lead text-green-pale">
          Start your application today, and our admissions team will be in touch
          to guide you through every step.
        </p>
        <Link href="/admissions" className="btn-primary mt-8">
          Apply now
        </Link>
      </Reveal>
    </Band>
  );
}
