import type { ElementType, ReactNode } from 'react';
import { Container } from './container';

// The "full-bleed band with contained inner content" pattern (design_system.md
// Section 5 & 12): the band spans the full viewport width and carries the
// background/colour to the screen edges; its inner Container keeps the content
// on the comfortable measure. Every coloured section, image band, and the
// footer is a Band, so the full-bleed/contained rhythm is consistent site-wide.
//
// `tone` picks a background from the token palette; pass `className` for any
// other treatment. Set `bleedInner` to render children edge-to-edge (e.g. a
// full-width gallery grid) without the inner Container.
const TONES: Record<string, string> = {
  none: '',
  paper: 'bg-paper text-ink',
  surface: 'bg-surface text-ink',
  mist: 'bg-green-mist text-ink',
  forest: 'bg-green-forest text-green-pale',
  ink: 'bg-green-ink text-green-pale',
};

export function Band({
  as: Tag = 'section',
  tone = 'none',
  padded = true,
  bleedInner = false,
  className = '',
  containerClassName = '',
  children,
}: {
  as?: ElementType;
  tone?: keyof typeof TONES | string;
  padded?: boolean;
  bleedInner?: boolean;
  className?: string;
  containerClassName?: string;
  children: ReactNode;
}) {
  const toneClass = TONES[tone] ?? '';
  return (
    <Tag className={`w-full ${toneClass} ${padded ? 'section-y' : ''} ${className}`}>
      {bleedInner ? children : <Container className={containerClassName}>{children}</Container>}
    </Tag>
  );
}
