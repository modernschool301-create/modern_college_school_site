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
const LOGO_ALT = 'Modern College & School';

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export function SiteNav({
  logoLight = '',
  logoDark = '',
}: {
  logoLight?: string;
  logoDark?: string;
}) {
  const pathname = usePathname();
  const { hasHero } = useNavHero();
  const [pastHero, setPastHero] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Does THIS page own a hero the nav should sit over? `hasHero` (from context)
  // is the general signal, but it is only flipped on by HeroNavMode's post-mount
  // effect — too late for the first paint. `pathname === '/'` is known
  // synchronously on the server and the very first client render, so the
  // homepage nav is already in the over-hero state at scrollY = 0 with NO solid
  // flash and NO SSR/hydration mismatch. (The homepage is the only hero page; if
  // another is added, `hasHero` still covers it after mount.)
  const overHeroPage = hasHero || pathname === '/';

  // ONE flag drives EVERYTHING below — background, links, and logo all read
  // `transparent`, so the bar can never be white-on-white: transparent bg always
  // pairs with white text/logo, solid --paper bg always pairs with dark ink text
  // and the green logo. Transparent only while over the hero and at the top.
  const transparent = overHeroPage && !pastHero && !menuOpen;

  // Measure the hero and flip to solid once its bottom passes under the nav.
  useEffect(() => {
    if (!overHeroPage) {
      setPastHero(false);
      return;
    }
    const NAV_HEIGHT = 80; // keep in sync with --nav-height
    const onScroll = () => {
      const hero = document.querySelector<HTMLElement>('[data-hero]');
      // No measurable hero yet → we are NOT past it, so stay transparent. (The
      // old `threshold = 0` fallback made `scrollY >= 0` true at the top, which
      // forced the background solid while over the hero — the desync bug.)
      if (!hero) {
        setPastHero(false);
        return;
      }
      const threshold = hero.offsetHeight - NAV_HEIGHT;
      setPastHero(window.scrollY >= threshold);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [overHeroPage]);

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

  // Shared link sizing for BOTH states (over-hero and solid). Colour + shadow
  // differ per state; size/weight/hover/focus are consistent.
  const linkBase =
    'rounded-sm px-2 py-1.5 font-medium transition-colors hover:underline underline-offset-4 decoration-2';
  const linkColor = transparent
    ? 'text-white hover:text-white nav-legible'
    : 'text-ink-muted hover:text-ink';

  // Logo: white mark on the dark/transparent state, green mark on --paper.
  const logoSrc = transparent ? logoLight : logoDark;

  return (
    <header
      className={[
        'z-50 w-full transition-colors duration-200',
        // STRUCTURAL: on a hero page the header must OVERLAY the hero, not sit in
        // a strip above it. `fixed` takes it out of normal flow so the hero (the
        // first in-flow element) starts at y=0 and renders UP behind the nav —
        // giving the transparent bar the dark green panel / video behind it
        // instead of the white page background. Non-hero pages keep `sticky`, so
        // the solid bar reserves its own space and never overlaps content.
        overHeroPage ? 'fixed inset-x-0 top-0' : 'sticky top-0',
        // Truly transparent over the hero (no faint bar); solid --paper otherwise.
        transparent
          ? 'bg-transparent'
          : 'border-b border-line bg-paper/95 backdrop-blur',
        !transparent && pastHero ? 'shadow-sm' : '',
      ].join(' ')}
    >
      {/* Over-hero legibility scrim — only in the transparent state; sits BEHIND
          the nav content (which is `relative`), full-width, subtle top-down. */}
      {transparent && <div aria-hidden="true" className="nav-scrim" />}

      <nav
        aria-label="Primary"
        className="container-page relative flex items-center justify-between gap-4"
        style={{ height: 'var(--nav-height)' }}
      >
        {/* Logo / wordmark — ~56px tall visible mark (e_trim strips the PNG's
            transparent padding). logoLight (white logo2) over the hero;
            logoDark (green logo1) on the solid --paper bar and non-hero pages. */}
        <Link
          href="/"
          className="flex items-center rounded-sm"
          aria-label={LOGO_ALT}
        >
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoSrc}
              alt={LOGO_ALT}
              className="w-auto"
              style={{ height: 'var(--nav-logo-height)' }}
            />
          ) : (
            <span
              className={[
                'font-display text-xl font-semibold tracking-tight',
                transparent ? 'text-white nav-legible' : 'text-green-ink',
              ].join(' ')}
            >
              Modern College &amp; School
            </span>
          )}
        </Link>

        {/* Desktop links */}
        <ul className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={isActive(pathname, link.href) ? 'page' : undefined}
                style={{ fontSize: 'var(--nav-link-size)' }}
                className={[
                  linkBase,
                  linkColor,
                  isActive(pathname, link.href) && !transparent
                    ? 'text-green-brand'
                    : '',
                ].join(' ')}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          {/* Persistent, always-reachable primary CTA (desktop). Keeps the
              rationed --green-signature; global :focus-visible gives it a ring. */}
          <Link
            href={APPLY_HREF}
            style={{ fontSize: 'var(--nav-link-size)' }}
            className="btn-primary hidden px-6 py-2.5 font-medium md:inline-flex"
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
              transparent ? 'text-white nav-legible' : 'text-green-ink',
            ].join(' ')}
          >
            <span aria-hidden="true" className="text-2xl leading-none">
              ☰
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile full-screen sheet — SOLID deep green, fully opaque, covers the
          page entirely (never lets the hero bleed through). */}
      {menuOpen && (
        <div
          id="mobile-nav"
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          className="fixed inset-0 z-[60] flex h-[100dvh] flex-col bg-green-forest text-green-pale md:hidden"
        >
          <div
            className="container-page flex shrink-0 items-center justify-between"
            style={{ height: 'var(--nav-height)' }}
          >
            {logoLight ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoLight}
                alt={LOGO_ALT}
                className="w-auto"
                style={{ height: 'var(--nav-logo-height)' }}
              />
            ) : (
              <span className="font-display text-lg font-semibold text-white">
                Modern College &amp; School
              </span>
            )}
            <button
              type="button"
              aria-label="Close menu"
              autoFocus
              onClick={() => setMenuOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-sm text-white"
            >
              <span aria-hidden="true" className="text-2xl leading-none">
                ✕
              </span>
            </button>
          </div>

          <div className="container-page flex flex-1 flex-col gap-1 overflow-y-auto pt-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(pathname, link.href) ? 'page' : undefined}
                className={[
                  'rounded-sm px-2 py-3 font-display text-2xl font-medium',
                  isActive(pathname, link.href) ? 'text-white' : 'text-green-pale',
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
