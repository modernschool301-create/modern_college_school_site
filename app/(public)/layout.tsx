import { SiteNav } from '@/components/site-nav';
import { SiteFooter } from '@/components/site-footer';
import { NavHeroProvider } from '@/components/nav-hero-context';
import { cloudinaryImage } from '@/lib/cloudinary-url';

// Shared public chrome (nav + footer). Every public page inherits this shell.
// NavHeroProvider lets a page with a hero tell the nav to start transparent;
// pages without one keep the nav solid from the top. The /admin layout is
// separate and intentionally untouched.
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Logo URLs built server-side (cloud name stays off the client). logo2 is the
  // solid-white mark for the dark/transparent state; logo1 is the green mark
  // for the solid --paper state. Empty string → nav falls back to a wordmark.
  // e_trim strips the transparent padding baked into the logo PNGs so the
  // visible wordmark fills the (now larger) nav logo height in both states.
  const cloud = process.env.CLOUDINARY_CLOUD_NAME ?? '';
  const logoLight = cloudinaryImage(cloud, 'modern/logo2', 'e_trim');
  const logoDark = cloudinaryImage(cloud, 'modern/logo1', 'e_trim');

  return (
    <NavHeroProvider>
      <SiteNav logoLight={logoLight} logoDark={logoDark} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </NavHeroProvider>
  );
}
