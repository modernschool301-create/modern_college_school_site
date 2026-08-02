import Link from 'next/link';

// Keeps "Apply now" reachable on mobile while scrolling (the desktop nav CTA is
// hidden on mobile behind the menu). Fixed to the bottom, mobile-only.
export function StickyApplyCta() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-green-brand/20 bg-paper/95 p-3 backdrop-blur md:hidden">
      <Link href="/apply" className="btn-primary w-full">
        Apply now
      </Link>
    </div>
  );
}
