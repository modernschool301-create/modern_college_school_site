import { Band } from '@/components/band';
import { Reveal } from '@/components/reveal';
import { CountUp } from './count-up';

// Evergreen approximations — deliberately not tied to any specific year, so the
// homepage needs zero seasonal maintenance. Real figures will come from the
// settings store later (see TODO in the page).
const STATS = [
  { to: 30, suffix: '+', label: 'years of teaching' },
  { to: 1200, suffix: '+', label: 'students' },
  { to: 60, suffix: '+', label: 'teachers' },
];

export function StatsBand() {
  return (
    <Band tone="paper">
      <Reveal
        stagger
        as="dl"
        className="grid gap-10 text-center sm:grid-cols-3"
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
