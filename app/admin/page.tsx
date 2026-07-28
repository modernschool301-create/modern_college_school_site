import Link from 'next/link';

// Text-only placeholder list of the modules (PRD 27). Each is wired up in its
// own later phase; this just confirms a signed-in admin is through the door.
const MODULES: { label: string; href: string }[] = [
  { label: 'News', href: '/admin/news' },
  { label: 'Gallery', href: '/admin/gallery' },
  { label: 'Programmes', href: '/admin/programmes' },
  { label: 'Achievements', href: '/admin/achievements' },
  { label: 'Testimonials', href: '/admin/testimonials' },
  { label: 'Scholarships', href: '/admin/scholarships' },
  { label: 'Downloads', href: '/admin/downloads' },
  { label: 'Admissions', href: '/admin/admissions' },
  { label: 'Submissions', href: '/admin/submissions' },
  { label: 'Contact Messages', href: '/admin/contact-messages' },
  { label: 'Settings', href: '/admin/settings' },
  { label: 'Users', href: '/admin/users' },
];

export default function AdminDashboardPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
      <p className="mt-2 text-sm text-ink-muted">
        You are signed in. Modules:
      </p>
      <ul className="mt-6 space-y-2">
        {MODULES.map((m) => (
          <li key={m.href}>
            <Link href={m.href} className="text-sm underline underline-offset-4">
              {m.label}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
