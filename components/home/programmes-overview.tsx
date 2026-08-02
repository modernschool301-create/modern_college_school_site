import Link from 'next/link';
import { Band } from '@/components/band';
import { Reveal } from '@/components/reveal';

// Evergreen programme blurbs — no dates, no intake years. Cards link to the
// programmes index for now; per-programme detail pages arrive with the CMS.
const PROGRAMMES = [
  {
    title: '+2 Management',
    blurb:
      'Business studies, computer science, hotel management and more — a broad +2 foundation for commerce and beyond.',
  },
  {
    title: '+2 Law',
    blurb:
      'A distinct +2 stream in partnership with Kathmandu School of Law, for students set on a legal career.',
  },
  {
    title: 'BBS',
    blurb:
      "A Bachelor's of Business Studies building the management and analytical depth that employers look for.",
  },
  {
    title: 'Secondary',
    blurb:
      'A strong secondary grounding that prepares students for the +2 programmes and the years that follow.',
  },
];

export function ProgrammesOverview() {
  return (
    // mist, not paper: in the homepage order this sits between ThreeBenefits
    // (paper) and VoicePreview (paper), so it is the quiet green break between
    // them.
    <Band tone="mist">
      <Reveal>
        <p className="text-eyebrow uppercase tracking-wide text-green-brand">
          What we offer
        </p>
        <h2 className="mt-2 max-w-2xl font-display text-h2 text-green-ink">
          Programmes for every stage, from secondary to Bachelor&apos;s
        </h2>
      </Reveal>

      <div className="mt-10 grid-auto-fit">
        {PROGRAMMES.map((programme) => (
          <Link
            key={programme.title}
            href="/programmes"
            className="group flex flex-col rounded-md border border-line bg-surface p-6 transition-transform duration-200 hover:-translate-y-0.5 hover:border-green-pale"
          >
            <h3 className="font-display text-h3 text-green-ink">
              {programme.title}
            </h3>
            <p className="mt-2 flex-1 text-small text-ink-muted">
              {programme.blurb}
            </p>
            <span className="mt-4 text-small font-medium text-green-brand">
              Learn more{' '}
              <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5 inline-block">
                →
              </span>
            </span>
          </Link>
        ))}
      </div>
    </Band>
  );
}
