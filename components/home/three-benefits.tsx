import { Band } from '@/components/band';
import { Reveal } from '@/components/reveal';

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

export function ThreeBenefits() {
  return (
    <Band tone="paper">
      <Reveal stagger className="grid-auto-fit">
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
    </Band>
  );
}
