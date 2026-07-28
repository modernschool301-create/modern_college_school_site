import Link from 'next/link';
import { Container } from './container';

// The calm bookend to the hero (design_system.md Sections 8 & 2): --green-forest
// ground, --green-pale text. A full-bleed band — colour to the screen edges,
// content on the container measure.
const PROGRAMME_LINKS = [
  { href: '/programmes', label: 'Secondary' },
  { href: '/programmes', label: '+2 Management' },
  { href: '/programmes', label: '+2 Law' },
  { href: '/programmes', label: 'BBS' },
];

const QUICK_LINKS = [
  { href: '/about', label: 'About us' },
  { href: '/admissions', label: 'Admissions' },
  { href: '/scholarships', label: 'Scholarships' },
  { href: '/news', label: 'News & events' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/downloads', label: 'Downloads' },
];

// TODO: replace with the school's real contact details before launch.
const CONTACT = {
  address: 'Srijananagar, Bhaktapur Municipality-1, Bhaktapur, Nepal',
  phone: '+977-1-0000000', // TODO: real phone
  email: 'info@modern.edu.np', // TODO: confirm real address
};

// TODO: real social profile URLs.
const SOCIAL = [
  { href: '#', label: 'Facebook' },
  { href: '#', label: 'Instagram' },
  { href: '#', label: 'YouTube' },
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

        {/* Programmes */}
        <nav aria-label="Programmes" className="flex flex-col gap-3">
          <h2 className="text-eyebrow uppercase tracking-wide text-green-pale/70">
            Programmes
          </h2>
          <ul className="flex flex-col gap-2 text-small">
            {PROGRAMME_LINKS.map((link, i) => (
              <li key={`${link.label}-${i}`}>
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
            <span>{CONTACT.address}</span>
            <a href={`tel:${CONTACT.phone.replace(/[^+\d]/g, '')}`} className="hover:text-white">
              {CONTACT.phone}
            </a>
            <a href={`mailto:${CONTACT.email}`} className="hover:text-white">
              {CONTACT.email}
            </a>
          </address>
          <ul className="mt-1 flex gap-4 text-small">
            {SOCIAL.map((s) => (
              <li key={s.label}>
                <a href={s.href} className="transition-colors hover:text-white">
                  {s.label}
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
