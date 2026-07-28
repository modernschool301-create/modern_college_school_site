import { SiteNav } from '@/components/site-nav';
import { SiteFooter } from '@/components/site-footer';
import { NavHeroProvider } from '@/components/nav-hero-context';

// Shared public chrome (nav + footer). Every public page inherits this shell.
// NavHeroProvider lets a page with a hero tell the nav to start transparent;
// pages without one keep the nav solid from the top. The /admin layout is
// separate and intentionally untouched.
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NavHeroProvider>
      <SiteNav />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </NavHeroProvider>
  );
}
