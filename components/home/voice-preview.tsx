import { Band } from '@/components/band';
import { Reveal } from '@/components/reveal';

// PLACEHOLDER testimonials — real ones wire in with the Testimonials CMS module.
const TESTIMONIALS = [
  {
    quote:
      'A placeholder testimonial. A real student quote about their time at Modern will sit here once testimonials are published from the admin.',
    name: 'Student name',
    programme: '+2 Management',
  },
  {
    quote:
      'Another placeholder quote. Keeping two here shows the two-up layout the real Student’s Voice preview will use.',
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
        <h2 className="mt-2 font-display text-h2 text-green-ink">
          What our students say
        </h2>
      </Reveal>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {TESTIMONIALS.map((testimonial, i) => (
          <figure
            key={i}
            className="flex flex-col rounded-md border border-line bg-surface p-8"
          >
            <blockquote className="flex-1 text-lead text-green-ink">
              “{testimonial.quote}”
            </blockquote>
            <figcaption className="mt-6 flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-green-pale font-display font-semibold text-green-brand"
              >
                {testimonial.name.charAt(0)}
              </span>
              <span className="text-small">
                <span className="block font-medium text-green-ink">
                  {testimonial.name}
                </span>
                <span className="block text-ink-muted">
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
