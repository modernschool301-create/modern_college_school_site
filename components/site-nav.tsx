'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useNavHero } from './nav-hero-context';

// The nav is a grouped structure: five top-level items, three of which open a
// dropdown. Home is deliberately absent — the logo is the home affordance (in
// the bar AND inside the mobile sheet).
type NavChild = { href: string; label: string };
type NavItem =
  | { kind: 'link'; href: string; label: string }
  | {
      kind: 'group';
      id: string;
      label: string;
      children: readonly NavChild[];
      // Panels hang left-aligned under their trigger by default. The rightmost
      // group aligns to its trigger's RIGHT edge instead, so a wide panel can
      // never run off-screen at narrow desktop widths.
      align?: 'end';
    };

const NAV_ITEMS: readonly NavItem[] = [
  {
    kind: 'group',
    id: 'life',
    label: 'Life at Modern',
    children: [
      { href: '/about', label: 'About us' },
      { href: '/learning-process', label: 'Learning process' },
      { href: '/achievements', label: 'Achievements' },
      { href: '/students-voice', label: "Student's voice" },
    ],
  },
  { kind: 'link', href: '/programmes', label: 'Programmes' },
  {
    kind: 'group',
    id: 'admissions',
    label: 'Admissions',
    children: [
      { href: '/admissions', label: 'Admission procedure' },
      { href: '/scholarships', label: 'Scholarships' },
    ],
  },
  {
    kind: 'group',
    id: 'news',
    label: 'News & media',
    align: 'end',
    children: [
      { href: '/news', label: 'News & notices' },
      { href: '/gallery', label: 'Gallery' },
      { href: '/downloads', label: 'Downloads' },
    ],
  },
  { kind: 'link', href: '/contact', label: 'Contact' },
] as const;

const APPLY_HREF = '/apply';
const LOGO_ALT = 'Modern College & School';

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

// Chevron for the dropdown triggers. Rotates when open; under
// prefers-reduced-motion it snaps instead of animating (design_system.md §6).
function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={[
        'shrink-0 transition-transform duration-200 ease-[var(--ease-soft)] motion-reduce:transition-none',
        open ? 'rotate-180' : '',
      ].join(' ')}
    >
      <path d="M4 6.5 8 10.5l4-4" />
    </svg>
  );
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
  // Which desktop dropdown is open (only ever one at a time), by group id.
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const desktopNavRef = useRef<HTMLUListElement>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});

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

  // Close the mobile sheet AND any open dropdown whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
    setOpenGroup(null);
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

  // Open dropdown: Escape closes it and returns focus to its trigger; a click
  // anywhere outside the desktop nav closes it. Focus is NOT trapped — tabbing
  // past the last panel link just leaves, and the group's onBlur closes up
  // behind it (see below), so Tab keeps flowing through the bar.
  useEffect(() => {
    if (!openGroup) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      triggerRefs.current[openGroup]?.focus();
      setOpenGroup(null);
    };
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const nav = desktopNavRef.current;
      if (nav && !nav.contains(e.target as Node)) setOpenGroup(null);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [openGroup]);

  // Hover-open is a POINTER-ONLY enhancement layered on top of click — never a
  // replacement, since hover excludes keyboard and touch entirely. Guarded on a
  // real hover-capable pointer so a tap does not fire it.
  const canHover = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches;

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
          className="flex shrink-0 items-center rounded-sm"
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

        {/* Desktop links. Breakpoint is `xl` (1280px), NOT md — see the note at
            the hamburger below. Column gap is fluid so the row tightens
            gracefully at 1280 and relaxes on wide screens, without ever taking
            the link type below the --nav-link-size scale. */}
        <ul
          ref={desktopNavRef}
          className="hidden items-center xl:flex"
          style={{ columnGap: 'clamp(0.75rem, 1.6vw, 1.75rem)' }}
        >
          {NAV_ITEMS.map((item) => {
            if (item.kind === 'link') {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    style={{ fontSize: 'var(--nav-link-size)' }}
                    className={[
                      linkBase,
                      linkColor,
                      active && !transparent ? 'text-green-brand' : '',
                    ].join(' ')}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            }

            const panelId = `nav-panel-${item.id}`;
            const open = openGroup === item.id;
            // The trigger wears the active-section style when the current page is
            // ANY of its children.
            const sectionActive = item.children.some((child) =>
              isActive(pathname, child.href),
            );

            return (
              <li
                key={item.id}
                className="relative"
                onMouseEnter={() => {
                  if (canHover()) setOpenGroup(item.id);
                }}
                onMouseLeave={() => {
                  if (canHover()) setOpenGroup((cur) => (cur === item.id ? null : cur));
                }}
                // Tab (or Shift+Tab) out of the trigger or the panel closes the
                // group behind the moving focus — no trap, focus just continues
                // to the next nav item. relatedTarget === null means focus left
                // for something unfocusable (a bare click); the pointerdown
                // handler owns that case.
                onBlur={(e) => {
                  if (!e.relatedTarget) return;
                  if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                  setOpenGroup((cur) => (cur === item.id ? null : cur));
                }}
              >
                <button
                  type="button"
                  ref={(el) => {
                    triggerRefs.current[item.id] = el;
                  }}
                  // A real <button>, so Enter and Space toggle natively.
                  onClick={() => setOpenGroup(open ? null : item.id)}
                  aria-expanded={open}
                  aria-controls={panelId}
                  aria-haspopup="true"
                  style={{ fontSize: 'var(--nav-link-size)' }}
                  className={[
                    linkBase,
                    linkColor,
                    'inline-flex items-center gap-1.5 whitespace-nowrap',
                    sectionActive && !transparent ? 'text-green-brand' : '',
                  ].join(' ')}
                >
                  {item.label}
                  <Chevron open={open} />
                </button>

                {/* The panel is its OWN visual layer: always solid --surface with
                    a --line hairline, so it reads identically whether the bar
                    behind it is transparent-over-hero or solid --paper. It is
                    never styled off the nav's `transparent` state. */}
                {open && (
                  // The outer element positions and carries the 8px offset as
                  // PADDING, not a margin: the gap between trigger and card then
                  // sits INSIDE the group's hover region, so travelling from the
                  // trigger down to the panel with the mouse can't fire the li's
                  // mouseleave and snap it shut halfway.
                  <div
                    id={panelId}
                    className={[
                      'absolute top-full z-10 pt-2',
                      item.align === 'end' ? 'right-0' : 'left-0',
                    ].join(' ')}
                  >
                    <ul className="flex min-w-56 flex-col rounded-md border border-line bg-surface p-2 shadow-lg">
                      {item.children.map((child) => {
                        const active = isActive(pathname, child.href);
                        return (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              aria-current={active ? 'page' : undefined}
                              onClick={() => setOpenGroup(null)}
                              className={[
                                'block whitespace-nowrap rounded-sm px-3 py-2 text-small transition-colors hover:bg-green-mist',
                                active
                                  ? 'font-medium text-green-brand'
                                  : 'text-ink',
                              ].join(' ')}
                            >
                              {child.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <div className="flex shrink-0 items-center gap-2">
          {/* Persistent, always-reachable primary CTA (desktop). Keeps the
              rationed --green-signature; global :focus-visible gives it a ring. */}
          <Link
            href={APPLY_HREF}
            style={{ fontSize: 'var(--nav-link-size)' }}
            className="btn-primary hidden whitespace-nowrap px-6 py-2.5 font-medium xl:inline-flex"
          >
            Apply now
          </Link>

          {/* Hamburger. Shown until `xl` (1280px), not `md`: the grouped labels
              ("Life at Modern", "News & media") are far wider than the old flat
              ones, and five triggers + the ~200px wordmark + the Apply button
              need ~1000px of content width — more than 1024px minus the
              container's own 5vw side padding leaves. Raising the breakpoint is
              the fix the design system allows; shrinking the link type below
              --nav-link-size is not. */}
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen(true)}
            className={[
              'inline-flex h-10 w-10 items-center justify-center rounded-sm xl:hidden',
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
          page entirely (never lets the hero bleed through). NO nested dropdowns
          in here: each group is a flat labelled section. */}
      {menuOpen && (
        <div
          id="mobile-nav"
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          className="fixed inset-0 z-[60] flex h-[100dvh] flex-col bg-green-forest text-green-pale xl:hidden"
        >
          <div
            className="container-page flex shrink-0 items-center justify-between"
            style={{ height: 'var(--nav-height)' }}
          >
            {/* With Home gone from the links, the logo is the ONLY way home —
                so it must be one in here too, not a bare image. */}
            <Link
              href="/"
              aria-label={LOGO_ALT}
              onClick={() => setMenuOpen(false)}
              className="flex items-center rounded-sm"
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
            </Link>
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

          <div className="container-page flex flex-1 flex-col gap-1 overflow-y-auto pb-8 pt-4">
            {NAV_ITEMS.map((item) => {
              if (item.kind === 'link') {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={[
                      'rounded-sm px-2 py-3 font-display text-2xl font-medium',
                      active ? 'text-white' : 'text-green-pale',
                    ].join(' ')}
                  >
                    {item.label}
                  </Link>
                );
              }

              const headingId = `mobile-group-${item.id}`;
              return (
                <section
                  key={item.id}
                  aria-labelledby={headingId}
                  className="mt-4 first:mt-0"
                >
                  <h2
                    id={headingId}
                    className="px-2 pb-1 font-body text-eyebrow font-medium text-green-pale/60"
                  >
                    {item.label}
                  </h2>
                  <div className="flex flex-col">
                    {item.children.map((child) => {
                      const active = isActive(pathname, child.href);
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          aria-current={active ? 'page' : undefined}
                          className={[
                            'rounded-sm px-2 py-3 font-display text-2xl font-medium',
                            active ? 'text-white' : 'text-green-pale',
                          ].join(' ')}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                </section>
              );
            })}

            <Link
              href={APPLY_HREF}
              className="btn-primary mt-6 w-full px-5 py-3 text-base"
            >
              Apply now
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
