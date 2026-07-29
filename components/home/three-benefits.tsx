import { Band } from '@/components/band';
import { Reveal } from '@/components/reveal';
import { CountUp } from './count-up';

// Institutional figures. HARDCODED SENSIBLE DEFAULTS for now — these will be
// settings-driven later (see the TODO on app/(public)/page.tsx). Real numbers
// so the counters read 30+/1,200+/60+, never 0+.
const STATS = [
  { to: 30, suffix: '+', label: 'years of teaching' },
  { to: 1200, suffix: '+', label: 'students' },
  { to: 60, suffix: '+', label: 'teachers' },
];

const iconProps = {
  width: 26,
  height: 26,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

// The emotional value proposition (hero → value prop → 3 benefits → CTA). Kept
// prominent, directly under the hero. Evergreen, story-framed copy.
const BENEFITS = [
  {
    text: 'Thirty years of family trust, proven by generations of graduates.',
    icon: (
      <svg {...iconProps} aria-hidden="true">
        <path d="M12 20s-7-4.3-7-9.2A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.8C19 15.7 12 20 12 20z" />
      </svg>
    ),
  },
  {
    text: 'A seamless path from school to university degrees without missing a step.',
    icon: (
      <svg {...iconProps} aria-hidden="true">
        <path d="M4 18h4v-4h4v-4h4V6h4" />
        <path d="M16 6h4v4" />
      </svg>
    ),
  },
  {
    text: 'Practical, real-world learning that builds confidence far beyond exams.',
    icon: (
      <svg {...iconProps} aria-hidden="true">
        <path d="M9 18h6M10 21h4" />
        <path d="M12 3a6 6 0 0 1 3.7 10.7c-.5.4-.7.9-.7 1.5v.3H9v-.3c0-.6-.2-1.1-.7-1.5A6 6 0 0 1 12 3z" />
      </svg>
    ),
  },
];

// One "why Modern, by the numbers" block directly under the hero: the three
// story benefits AND the three headline stats live together here (the old
// separate lower stats band is gone). Benefits row on top, stats row below.
export function ThreeBenefits() {
  return (
    <Band tone="paper">
      <Reveal>
        <p className="text-eyebrow uppercase tracking-wide text-green-brand">
          Why Modern
        </p>
        <h2 className="mt-2 max-w-2xl font-display text-h2 text-green-ink">
          Trusted for a generation, by the numbers
        </h2>
      </Reveal>

      <Reveal stagger className="mt-10 grid-auto-fit">
        {BENEFITS.map((benefit) => (
          <div
            key={benefit.text}
            className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-8"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-green-mist text-green-brand">
              {benefit.icon}
            </span>
            <p className="text-lead text-green-ink">{benefit.text}</p>
          </div>
        ))}
      </Reveal>

      {/* Stats row — counts up on scroll; CountUp shows the final value
          immediately under prefers-reduced-motion. */}
      <Reveal
        stagger
        as="dl"
        className="mt-14 grid gap-10 border-t border-line pt-14 text-center sm:grid-cols-3"
      >
        {STATS.map((stat) => (
          <div key={stat.label} className="flex flex-col items-center gap-1">
            <dd className="font-display text-h1 font-semibold text-green-brand">
              <CountUp to={stat.to} />
              {stat.suffix}
            </dd>
            <dt className="text-small text-ink-muted">{stat.label}</dt>
          </div>
        ))}
      </Reveal>
    </Band>
  );
}
