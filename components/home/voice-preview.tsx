import { Band } from '@/components/band';
import { Reveal } from '@/components/reveal';

// PLACEHOLDER testimonials — real ones (with real photos) wire in with the
// Testimonials CMS module. Given real prominence here (position #3): student
// voices carry more weight than feature lists.
const TESTIMONIALS = [
  {
    quote:
      'A placeholder testimonial. A real student quote about their years at Modern will sit here once testimonials are published from the admin.',
    name: 'Student name',
    programme: '+2 Management',
  },
  {
    quote:
      'Another placeholder quote. Two are shown here to preview the two-up layout the real Student’s Voice section will use.',
    name: 'Student name',
    programme: 'BBS',
  },
];

export function VoicePreview() {
  return (
    <Band tone="mist">
      <Reveal>
        <p className="text-eyebrow uppercase tracking-wide text-green-brand">
          Student&apos;s voice
        </p>
        <h2 className="mt-2 max-w-2xl font-display text-h2 text-green-ink">
          The people who know us best
        </h2>
      </Reveal>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {TESTIMONIALS.map((testimonial, i) => (
          <figure
            key={i}
            className="flex flex-col rounded-lg border border-line bg-surface p-8"
          >
            <blockquote className="flex-1 text-lead text-green-ink">
              “{testimonial.quote}”
            </blockquote>
            <figcaption className="mt-6 flex items-center gap-4">
              {/* Placeholder photo — a real headshot replaces this avatar. */}
              <span
                aria-hidden="true"
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-green-pale font-display text-2xl font-semibold text-green-brand"
              >
                {testimonial.name.charAt(0)}
              </span>
              <span className="text-body">
                <span className="block font-medium text-green-ink">
                  {testimonial.name}
                </span>
                <span className="block text-small text-ink-muted">
                  {testimonial.programme}
                </span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </Band>
  );
}
