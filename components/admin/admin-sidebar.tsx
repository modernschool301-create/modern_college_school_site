'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Modules per PRD 27. Every link below is now a built module — Admissions was
// the last stub, and it completes the set.
//
// `ownerOnly` hides a link from an admin who is not the owner. COSMETIC ONLY —
// it saves them clicking into a page that would bounce them straight back. The
// page's own requireActiveOwner() is the gate, and the owner-only policies on
// profiles are the enforcement.
const MODULES = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/news', label: 'News' },
  { href: '/admin/gallery', label: 'Gallery' },
  { href: '/admin/programmes', label: 'Programmes' },
  { href: '/admin/achievements', label: 'Achievements' },
  { href: '/admin/leadership', label: 'Leadership' },
  { href: '/admin/testimonials', label: 'Testimonials' },
  { href: '/admin/scholarships', label: 'Scholarships' },
  { href: '/admin/downloads', label: 'Downloads' },
  { href: '/admin/admissions', label: 'Admissions' },
  { href: '/admin/submissions', label: 'Submissions' },
  { href: '/admin/contact-messages', label: 'Contact Messages' },
  { href: '/admin/settings', label: 'Settings' },
  { href: '/admin/users', label: 'Users', ownerOnly: true },
];

function isActive(pathname: string, href: string): boolean {
  return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
}

export function AdminSidebar({ isOwner = false }: { isOwner?: boolean }) {
  const pathname = usePathname();
  const visible = MODULES.filter((module) => !module.ownerOnly || isOwner);
  return (
    <nav
      aria-label="Admin sections"
      className="flex gap-1 overflow-x-auto p-3 md:flex-col md:overflow-visible"
    >
      {visible.map((module) => {
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
