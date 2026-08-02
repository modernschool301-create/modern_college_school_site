import { Band } from '@/components/band';
import { Reveal } from '@/components/reveal';

// Simple line icons (stroke = currentColor) so no icon dependency is needed and
// they inherit the brand green.
const iconProps = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const FEATURES = [
  {
    label: 'Computer lab',
    icon: (
      <svg {...iconProps} aria-hidden="true">
        <rect x="3" y="4" width="18" height="12" rx="1.5" />
        <path d="M8 20h8M12 16v4" />
      </svg>
    ),
  },
  {
    label: 'Library',
    icon: (
      <svg {...iconProps} aria-hidden="true">
        <path d="M4 5a1 1 0 0 1 1-1h5v16H5a1 1 0 0 1-1-1zM20 5a1 1 0 0 0-1-1h-5v16h5a1 1 0 0 0 1-1z" />
      </svg>
    ),
  },
  {
    label: 'Sports',
    icon: (
      <svg {...iconProps} aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 3.5v17M3.5 12h17" />
      </svg>
    ),
  },
  {
    label: 'Scholarships',
    icon: (
      <svg {...iconProps} aria-hidden="true">
        <circle cx="12" cy="9" r="5" />
        <path d="M9 13.5 8 21l4-2 4 2-1-7.5" />
      </svg>
    ),
  },
  {
    label: 'Transport',
    icon: (
      <svg {...iconProps} aria-hidden="true">
        <rect x="4" y="5" width="16" height="11" rx="2" />
        <path d="M4 11h16M7.5 19v-3M16.5 19v-3" />
        <circle cx="8" cy="16" r="0.6" />
        <circle cx="16" cy="16" r="0.6" />
      </svg>
    ),
  },
  {
    label: 'Cafeteria',
    icon: (
      <svg {...iconProps} aria-hidden="true">
        <path d="M6 3v6a3 3 0 0 0 6 0V3M9 3v18M16 3c-1.5 1-2 3-2 5s.5 3 2 4v9" />
      </svg>
    ),
  },
];

export function FeaturesStrip() {
  return (
    // paper, not mist: the facilities strip is the CLEAN, quiet band that
    // follows the dark NewsTeaser (forest) and precedes ClosingCTA (forest).
    // The icon chips keep their --green-pale fill, which reads as the accent it
    // is against paper.
    <Band tone="paper">
      <Reveal>
        <p className="text-eyebrow uppercase tracking-wide text-green-brand">
          Why Modern
        </p>
        <h2 className="mt-2 max-w-2xl font-display text-h2 text-green-ink">
          Facilities that support real learning
        </h2>
      </Reveal>

      <ul className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
        {FEATURES.map((feature) => (
          <li key={feature.label} className="flex flex-col items-center gap-3 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-green-pale text-green-brand">
              {feature.icon}
            </span>
            <span className="text-small font-medium text-green-ink">
              {feature.label}
            </span>
          </li>
        ))}
      </ul>
    </Band>
  );
}
