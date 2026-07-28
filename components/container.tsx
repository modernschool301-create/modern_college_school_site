import type { ElementType, ReactNode } from 'react';

// The content container: min(1440px, 100%), centered, fluid clamp() side padding
// (design_system.md Section 5). Everything that is running content — not a
// full-bleed background — sits inside one of these.
export function Container({
  as: Tag = 'div',
  className = '',
  children,
}: {
  as?: ElementType;
  className?: string;
  children: ReactNode;
}) {
  return <Tag className={`container-page ${className}`}>{children}</Tag>;
}
