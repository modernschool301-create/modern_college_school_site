import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { checkManagementStreamWarning } from '@/lib/admissions-warning';

// The admin landing page (PRD 27): an attention summary and per-module counts,
// plus the links into every module. It used to be the links alone.
//
// EVERY query on this page is `count: 'exact', head: true` — a count with no row
// data at all, so the page never pulls a table down just to measure it. They all
// start together, so the page costs one round-trip's latency rather than one per
// module.
//
// The counts are what an ADMIN can see, because they run under the admin's own
// session and RLS decides what is countable. That is the point: the authenticated
// SELECT policies expose drafts to an active admin, so the draft column is real
// rather than always zero. Nothing here is a security boundary — the layout's
// live active-admin check already ran, and each module's policies are what
// actually refuse anything.

// Modules with an is_published column, so each gets a published/draft split.
const CONTENT_MODULES = [
  { table: 'posts', label: 'News', href: '/admin/news' },
  { table: 'gallery_albums', label: 'Gallery albums', href: '/admin/gallery' },
  { table: 'programmes', label: 'Programmes', href: '/admin/programmes' },
  { table: 'achievements', label: 'Achievements', href: '/admin/achievements' },
  {
    table: 'leadership_messages',
    label: 'Leadership messages',
    href: '/admin/leadership',
  },
  { table: 'testimonials', label: 'Testimonials', href: '/admin/testimonials' },
  { table: 'scholarships', label: 'Scholarships', href: '/admin/scholarships' },
  { table: 'downloads', label: 'Downloads', href: '/admin/downloads' },
];

const MODULES: { label: string; href: string }[] = [
  { label: 'News', href: '/admin/news' },
  { label: 'Gallery', href: '/admin/gallery' },
  { label: 'Programmes', href: '/admin/programmes' },
  { label: 'Achievements', href: '/admin/achievements' },
  { label: 'Leadership', href: '/admin/leadership' },
  { label: 'Testimonials', href: '/admin/testimonials' },
  { label: 'Scholarships', href: '/admin/scholarships' },
  { label: 'Downloads', href: '/admin/downloads' },
  { label: 'Admissions', href: '/admin/admissions' },
  { label: 'Submissions', href: '/admin/submissions' },
  { label: 'Contact Messages', href: '/admin/contact-messages' },
  { label: 'Settings', href: '/admin/settings' },
  { label: 'Users', href: '/admin/users' },
];

// An attention tile earns the --warning treatment only when its number is
// actually above zero. A permanently amber "0 waiting" teaches an admin to stop
// reading the colour.
function AttentionCard({
  label,
  count,
  quiet,
  href,
}: {
  label: string;
  count: number;
  quiet: string;
  href: string;
}) {
  const needsAction = count > 0;
  return (
    <Link
      href={href}
      className={[
        'block rounded-md border p-5 transition-colors',
        needsAction
          ? 'border-warning/40 bg-warning/10 hover:bg-warning/15'
          : 'border-line bg-surface hover:bg-green-mist/50',
      ].join(' ')}
    >
      <p className="text-sm font-medium text-ink-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-green-ink">
        {count}
      </p>
      <p className="mt-1 text-xs text-ink-muted">
        {needsAction ? 'Waiting for you' : quiet}
      </p>
    </Link>
  );
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [contentCounts, photoResult, submissionResult, messageResult, streamWarning] =
    await Promise.all([
      // The outer map builds every promise before any is awaited, so all
      // sixteen counts are in flight together, not one module after another.
      Promise.all(
        CONTENT_MODULES.map(async (module) => {
          const [totalResult, publishedResult] = await Promise.all([
            supabase.from(module.table).select('id', { count: 'exact', head: true }),
            supabase
              .from(module.table)
              .select('id', { count: 'exact', head: true })
              .eq('is_published', true),
          ]);
          const total = totalResult.count ?? 0;
          const published = publishedResult.count ?? 0;
          return {
            ...module,
            total,
            published,
            // Derived, not queried: a third count for the same answer would be
            // a third round trip.
            drafts: Math.max(total - published, 0),
          };
        }),
      ),
      // Photos hang off albums and have no is_published of their own (an album
      // publishes as a unit), so this is a plain total.
      supabase.from('gallery_photos').select('id', { count: 'exact', head: true }),
      supabase
        .from('admission_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'new'),
      // contact_messages models its status as a CHECK-constrained text column
      // ('new' | 'read' | 'archived'), lower-case — not the submission_status
      // enum, and not 'New'.
      supabase
        .from('contact_messages')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'new'),
      checkManagementStreamWarning(supabase),
    ]);

  const photoCount = photoResult.count ?? 0;
  const newSubmissions = submissionResult.count ?? 0;
  const unreadMessages = messageResult.count ?? 0;

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="font-display text-h2 text-green-ink">Dashboard</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">
        What is waiting for someone, and what is currently published across the
        site.
      </p>

      {/* ── Attention first ───────────────────────────────────────────────── */}
      <section aria-labelledby="attention-heading" className="mt-10">
        <h2 id="attention-heading" className="text-sm font-semibold text-green-ink">
          Needs attention
        </h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <AttentionCard
            label="New admission applications"
            count={newSubmissions}
            quiet="Nothing new"
            href="/admin/submissions"
          />
          <AttentionCard
            label="Unread contact messages"
            count={unreadMessages}
            quiet="All read"
            href="/admin/contact-messages"
          />
        </div>

        {streamWarning && (
          <div
            role="status"
            className="mt-4 rounded-md border border-warning/40 bg-warning/10 p-5"
          >
            <p className="font-medium text-green-ink">
              +2 Management is open, but no stream is being offered
            </p>
            <p className="mt-2 max-w-2xl text-sm text-ink-muted">
              The form asks applicants which stream they want and the list is
              empty, so nobody can apply. Visitors see &ldquo;admissions opening
              soon&rdquo; rather than a broken picker, so nothing looks wrong to
              them and no application is being lost — but none is being taken
              either.{' '}
              <Link
                href="/admin/admissions"
                className="font-medium text-green-brand underline-offset-2 hover:underline"
              >
                Add or restore a stream
              </Link>{' '}
              and the form starts working immediately.
            </p>
          </div>
        )}
      </section>

      {/* ── Content counts ────────────────────────────────────────────────── */}
      <section aria-labelledby="content-heading" className="mt-12">
        <h2 id="content-heading" className="text-sm font-semibold text-green-ink">
          Content
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Totals across every module, with what the public can currently see.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {contentCounts.map((module) => (
            <Link
              key={module.href}
              href={module.href}
              className="block rounded-md border border-line bg-surface p-5 transition-colors hover:border-green-pale hover:bg-green-mist/50"
            >
              <p className="text-sm font-medium text-ink-muted">{module.label}</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-green-ink">
                {module.total}
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                {module.published} published
                {module.drafts > 0 &&
                  ` · ${module.drafts} draft${module.drafts === 1 ? '' : 's'}`}
                {/* Gallery counts ALBUMS, so the photo total is said here
                    rather than implied — "4" on a gallery tile otherwise reads
                    as four photos. */}
                {module.table === 'gallery_albums' &&
                  ` · ${photoCount} photo${photoCount === 1 ? '' : 's'}`}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── The links, kept ───────────────────────────────────────────────── */}
      <section aria-labelledby="modules-heading" className="mt-12">
        <h2 id="modules-heading" className="text-sm font-semibold text-green-ink">
          All modules
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Users is owner-only — an admin who is not the owner will be sent back
          from it.
        </p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {MODULES.map((module) => (
            <li key={module.href}>
              <Link
                href={module.href}
                className="inline-block rounded-sm border border-line px-3 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:bg-green-mist hover:text-ink"
              >
                {module.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
