'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useNavHero } from './nav-hero-context';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/programmes', label: 'Programmes' },
  { href: '/admissions', label: 'Admissions' },
  { href: '/news', label: 'News' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/contact', label: 'Contact' },
] as const;

const APPLY_HREF = '/admissions';

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export function SiteNav() {
  const pathname = usePathname();
  const { hasHero } = useNavHero();
  const [pastHero, setPastHero] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Transparent only while a hero is present AND we are still over it. Pages
  // without a hero (hasHero false) are solid from the first paint. Once scrolled
  // past the hero, the bar turns solid --paper with dark ink text.
  const transparent = hasHero && !pastHero && !menuOpen;

  // Measure the hero and flip to solid once its bottom passes under the nav
  // (design_system.md Section 7). Re-measures on resize; no-ops without a hero.
  useEffect(() => {
    if (!hasHero) {
      setPastHero(false);
      return;
    }
    const NAV_HEIGHT = 64;
    const onScroll = () => {
      const hero = document.querySelector<HTMLElement>('[data-hero]');
      const threshold = hero ? hero.offsetHeight - NAV_HEIGHT : 0;
      setPastHero(window.scrollY >= threshold);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [hasHero]);

  // Close the mobile sheet whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Lock body scroll + allow Escape to close while the sheet is open.
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const linkColor = transparent
    ? 'text-green-pale hover:text-white'
    : 'text-ink-muted hover:text-ink';

  return (
    <header
      className={[
        'sticky top-0 z-50 w-full transition-colors duration-200',
        transparent
          ? 'nav-scrim'
          : 'bg-paper/95 backdrop-blur border-b border-line',
        !transparent && pastHero ? 'shadow-sm' : '',
      ].join(' ')}
    >
      <nav
        aria-label="Primary"
        className="container-page flex h-16 items-center justify-between gap-4"
      >
        {/* Wordmark (a real logo comes later). */}
        <Link
          href="/"
          className={[
            'font-display text-lg font-semibold tracking-tight',
            transparent ? 'text-white' : 'text-green-ink',
          ].join(' ')}
        >
          Modern College &amp; School
        </Link>

        {/* Desktop links */}
        <ul className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={isActive(pathname, link.href) ? 'page' : undefined}
                className={[
                  'text-small font-medium transition-colors',
                  linkColor,
                  isActive(pathname, link.href) && !transparent ? 'text-green-brand' : '',
                  isActive(pathname, link.href) && transparent ? 'text-white' : '',
                ].join(' ')}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          {/* Persistent, always-reachable primary CTA (the rationed green). */}
          <Link
            href={APPLY_HREF}
            className="btn-primary hidden px-5 py-2.5 text-small md:inline-flex"
          >
            Apply now
          </Link>

          {/* Hamburger (mobile only) */}
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen(true)}
            className={[
              'inline-flex h-10 w-10 items-center justify-center rounded-sm md:hidden',
              transparent ? 'text-white' : 'text-green-ink',
            ].join(' ')}
          >
            <span aria-hidden="true" className="text-2xl leading-none">☰</span>
          </button>
        </div>
      </nav>

      {/* Mobile full-height sheet */}
      {menuOpen && (
        <div
          id="mobile-nav"
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          className="fixed inset-0 z-[60] flex flex-col bg-paper md:hidden"
        >
          <div className="container-page flex h-16 items-center justify-between">
            <span className="font-display text-lg font-semibold text-green-ink">
              Menu
            </span>
            <button
              type="button"
              aria-label="Close menu"
              autoFocus
              onClick={() => setMenuOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-sm text-green-ink"
            >
              <span aria-hidden="true" className="text-2xl leading-none">✕</span>
            </button>
          </div>

          <div className="container-page flex flex-1 flex-col gap-1 pt-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(pathname, link.href) ? 'page' : undefined}
                className={[
                  'rounded-sm px-2 py-3 font-display text-2xl font-medium',
                  isActive(pathname, link.href) ? 'text-green-brand' : 'text-green-ink',
                ].join(' ')}
              >
                {link.label}
              </Link>
            ))}

            <Link
              href={APPLY_HREF}
              className="btn-primary mt-4 w-full px-5 py-3 text-base"
            >
              Apply now
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
