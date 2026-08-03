import type { ReactNode } from 'react';
import Link from 'next/link';
import { SCHOOL_CONTACT } from '@/lib/contact-details';
import { Container } from './container';

// The calm bookend to the hero (design_system.md Sections 8 & 2): --green-forest
// ground, --green-pale text. A full-bleed band — colour to the screen edges,
// content on the container measure.

// Every href here is a STATIC route. The four old entries ("Secondary",
// "+2 Management", "+2 Law", "BBS") all pointed at /programmes, so four labels
// led to one page. Programme detail pages now live at /programmes/[slug], but
// those slugs are editor-owned and can be renamed or unpublished from the admin
// at any time — hardcoding them here would trade four honest-looking dead ends
// for four real 404s. So the column lists the programmes index once and fills
// out with the other "life at Modern" pages, mirroring the nav's grouping.
const EXPLORE_LINKS = [
  { href: '/programmes', label: 'All programmes' },
  { href: '/learning-process', label: 'Learning process' },
  { href: '/achievements', label: 'Achievements' },
  { href: '/students-voice', label: "Student's voice" },
];

const QUICK_LINKS = [
  { href: '/about', label: 'About us' },
  { href: '/admissions', label: 'Admissions' },
  { href: '/scholarships', label: 'Scholarships' },
  { href: '/news', label: 'News & events' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/downloads', label: 'Downloads' },
];

// Hand-rolled inline glyphs: lucide-react is not a dependency and three icons do
// not justify adding one. Stroke-based, currentColor, 24px box — the same shape
// language as the nav's chevron.
function FacebookIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <path d="m10 15 5-3-5-3z" />
    </svg>
  );
}

// `label` is the accessible name, not decoration — an icon on its own is an
// unnamed link to a screen reader. Each opens a profile off-site.
const SOCIAL: { href: string; label: string; icon: ReactNode }[] = [
  {
    href: 'https://www.facebook.com/UniversalModern/',
    label: 'Modern College & School on Facebook',
    icon: <FacebookIcon />,
  },
  {
    href: 'https://www.instagram.com/moderncollege.np/',
    label: 'Modern College & School on Instagram',
    icon: <InstagramIcon />,
  },
  {
    href: 'https://www.youtube.com/@modernschoolandcollege',
    label: 'Modern College & School on YouTube',
    icon: <YouTubeIcon />,
  },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full bg-green-forest text-green-pale">
      <Container className="grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-4">
        {/* Identity */}
        <div className="flex flex-col gap-3">
          <span className="font-display text-lg font-semibold text-white">
            Modern College &amp; School
          </span>
          <p className="text-small text-green-pale/80">
            Education for peace and prosperity, since 1993. A modern +2 and
            Bachelor’s institution in Bhaktapur.
          </p>
        </div>

        {/* Explore */}
        <nav aria-label="Explore" className="flex flex-col gap-3">
          <h2 className="text-eyebrow uppercase tracking-wide text-green-pale/70">
            Explore
          </h2>
          <ul className="flex flex-col gap-2 text-small">
            {EXPLORE_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="transition-colors hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Quick links */}
        <nav aria-label="Quick links" className="flex flex-col gap-3">
          <h2 className="text-eyebrow uppercase tracking-wide text-green-pale/70">
            Quick links
          </h2>
          <ul className="flex flex-col gap-2 text-small">
            {QUICK_LINKS.map((link) => (
              <li key={link.href + link.label}>
                <Link href={link.href} className="transition-colors hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Contact */}
        <div className="flex flex-col gap-3">
          <h2 className="text-eyebrow uppercase tracking-wide text-green-pale/70">
            Get in touch
          </h2>
          <address className="flex flex-col gap-2 text-small not-italic text-green-pale/90">
            <span>{SCHOOL_CONTACT.address}</span>
            {SCHOOL_CONTACT.phones.map((phone) => (
              <a
                key={phone.dial}
                href={`tel:${phone.dial}`}
                className="transition-colors hover:text-white"
              >
                {phone.display}
              </a>
            ))}
            {SCHOOL_CONTACT.emails.map((email) => (
              <a
                key={email}
                href={`mailto:${email}`}
                className="break-words transition-colors hover:text-white"
              >
                {email}
              </a>
            ))}
          </address>
          <ul className="mt-1 flex gap-2">
            {SOCIAL.map((social) => (
              <li key={social.href}>
                <a
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  // 40px hit target — a 20px glyph alone is too small to tap.
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full text-green-pale/90 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {social.icon}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </Container>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <Container className="flex flex-col items-center justify-between gap-2 py-6 text-small text-green-pale/70 sm:flex-row">
          <span>© {year} Modern College &amp; School. All rights reserved.</span>
          <Link href="/privacy" className="hover:text-white">
            Privacy
          </Link>
        </Container>
      </div>
    </footer>
  );
}
