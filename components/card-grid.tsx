import type { ReactNode } from 'react';

// The shared card grid (design_system.md §5). EXPLICIT column counts per variant
// — never auto-fit, whose count drifted with container width. The grid classes
// live in globals.css (card-grid-text / card-grid-media) as @utility blocks; the
// grid declares the row tracks its ContentCard children subgrid into, so it must
// carry no padding of its own (padding on a subgrid parent shifts those tracks).
//
//   'text'  — 1 col, 2 from 880px. Wide measure for quote cards.
//   'media' — 1 col, 2 from 640px, 3 from 1024px. Image + title + body cards.
const VARIANT_CLASS = {
  text: 'card-grid-text',
  media: 'card-grid-media',
} as const;

export function CardGrid({
  variant,
  className = '',
  children,
}: {
  variant: keyof typeof VARIANT_CLASS;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`${VARIANT_CLASS[variant]} ${className}`.trim()}>
      {children}
    </div>
  );
}
