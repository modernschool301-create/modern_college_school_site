import { Band } from '@/components/band';
import { Reveal } from '@/components/reveal';
import { statOrFallback } from '@/lib/settings';
import { CountUp } from './count-up';

// Institutional figures, now SETTINGS-DRIVEN (PRD 11). The homepage reads the
// three values from the settings store and passes them in.
//
// The hardcoded figures survive as FALLBACKS, not as the source of truth: a
// blank setting renders the real number below rather than an empty stat or a
// counter climbing to 0. PRD 11 is explicit that the current site's unfilled
// "0 +" is the thing to avoid.
const STAT_FALLBACKS = {
  years: '30+',
  students: '1,200+',
  teachers: '60+',
};

// A statistic is stored as ONE free-text string ('1,200+') because the suffix is
// part of what the school wants displayed — see the Settings page. The counter,
// though, needs a number.
//
// So: split the leading digits (commas allowed) from whatever follows, animate
// the number, and render the remainder statically beside it. '1,200+' counts up
// to 1,200 with a '+' pinned next to it, exactly as the hardcoded version did.
//
// A value with no leading number ('over a thousand') simply does not animate —
// it renders verbatim. That is the right failure: the figure the school typed is
// always what a visitor reads, and only the animation is negotiable.
function splitStat(value: string): { to: number; suffix: string } | null {
  const match = value.trim().match(/^([\d,]+)(.*)$/);
  if (!match) return null;
  const to = Number(match[1].replace(/,/g, ''));
  if (!Number.isFinite(to)) return null;
  return { to, suffix: match[2] };
}

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
export function ThreeBenefits({
  statYears = '',
  statStudents = '',
  statTeachers = '',
}: {
  statYears?: string;
  statStudents?: string;
  statTeachers?: string;
}) {
  // Fallbacks are applied HERE rather than at the call site, so the component
  // renders real figures whatever it is handed — including nothing at all.
  const stats = [
    {
      value: statOrFallback(statYears, STAT_FALLBACKS.years),
      label: 'years of teaching',
    },
    {
      value: statOrFallback(statStudents, STAT_FALLBACKS.students),
      label: 'students',
    },
    {
      value: statOrFallback(statTeachers, STAT_FALLBACKS.teachers),
      label: 'teachers',
    },
  ];

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
        {stats.map((stat) => {
          const parsed = splitStat(stat.value);
          return (
            <div key={stat.label} className="flex flex-col items-center gap-1">
              <dd className="font-display text-h1 font-semibold text-green-brand">
                {parsed ? (
                  <>
                    <CountUp to={parsed.to} />
                    {parsed.suffix}
                  </>
                ) : (
                  stat.value
                )}
              </dd>
              <dt className="text-small text-ink-muted">{stat.label}</dt>
            </div>
          );
        })}
      </Reveal>
    </Band>
  );
}
