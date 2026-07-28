import Link from 'next/link';
import { Band } from '@/components/band';
import { Reveal } from '@/components/reveal';

// PLACEHOLDER content — real posts wire in with the News CMS module. No dates
// are shown here so nothing reads as stale before that wiring exists; the
// `kind` tag stands in for the post type.
const LEAD = {
  kind: 'Notice',
  title: 'Placeholder headline for the lead news item',
  excerpt:
    'A short standfirst for the featured post will appear here once the News module is publishing real content. It keeps the homepage feeling current.',
};

const SECONDARY = [
  { kind: 'Event', title: 'Placeholder secondary news item one' },
  { kind: 'News', title: 'Placeholder secondary news item two' },
];

export function NewsTeaser() {
  return (
    <Band tone="paper">
      <Reveal className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-eyebrow uppercase tracking-wide text-green-brand">
            Latest
          </p>
          <h2 className="mt-2 font-display text-h2 text-green-ink">
            News &amp; events
          </h2>
        </div>
        <Link
          href="/news"
          className="text-small font-medium text-green-brand hover:underline"
        >
          View all news →
        </Link>
      </Reveal>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {/* Lead item */}
        <Link
          href="/news"
          className="group flex flex-col justify-end overflow-hidden rounded-md border border-line bg-green-mist p-8 transition-transform duration-200 hover:-translate-y-0.5"
        >
          <span className="badge badge-neutral w-fit uppercase">{LEAD.kind}</span>
          <h3 className="mt-3 font-display text-h3 text-green-ink">
            {LEAD.title}
          </h3>
          <p className="mt-2 text-small text-ink-muted">{LEAD.excerpt}</p>
        </Link>

        {/* Secondary items */}
        <div className="flex flex-col gap-6">
          {SECONDARY.map((item) => (
            <Link
              key={item.title}
              href="/news"
              className="flex flex-1 flex-col justify-center rounded-md border border-line bg-surface p-6 transition-transform duration-200 hover:-translate-y-0.5 hover:border-green-pale"
            >
              <span className="badge badge-neutral w-fit uppercase">
                {item.kind}
              </span>
              <h3 className="mt-2 font-display text-h3 text-green-ink">
                {item.title}
              </h3>
            </Link>
          ))}
        </div>
      </div>
    </Band>
  );
}
