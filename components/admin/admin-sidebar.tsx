'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Modules per PRD 27. News, Gallery, Programmes, Achievements, Testimonials,
// Scholarships and Downloads are live; the rest are existing stubs.
const MODULES = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/news', label: 'News' },
  { href: '/admin/gallery', label: 'Gallery' },
  { href: '/admin/programmes', label: 'Programmes' },
  { href: '/admin/achievements', label: 'Achievements' },
  { href: '/admin/testimonials', label: 'Testimonials' },
  { href: '/admin/scholarships', label: 'Scholarships' },
  { href: '/admin/downloads', label: 'Downloads' },
  { href: '/admin/admissions', label: 'Admissions' },
  { href: '/admin/submissions', label: 'Submissions' },
  { href: '/admin/contact-messages', label: 'Contact Messages' },
  { href: '/admin/settings', label: 'Settings' },
  { href: '/admin/users', label: 'Users' },
];

function isActive(pathname: string, href: string): boolean {
  return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
}

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Admin sections"
      className="flex gap-1 overflow-x-auto p-3 md:flex-col md:overflow-visible"
    >
      {MODULES.map((module) => {
        const active = isActive(pathname, module.href);
        return (
          <Link
            key={module.href}
            href={module.href}
            aria-current={active ? 'page' : undefined}
            className={[
              'shrink-0 rounded-sm px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-green-mist text-green-ink'
                : 'text-ink-muted hover:bg-green-mist/60 hover:text-ink',
            ].join(' ')}
          >
            {module.label}
          </Link>
        );
      })}
    </nav>
  );
}
