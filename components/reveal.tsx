'use client';

import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react';

// Moderate-motion scroll reveal (design_system.md Section 6): fade + 16px rise,
// once, as the element enters view. Children opt in by wrapping with <Reveal>.
// The hidden start-state lives in globals.css under `prefers-reduced-motion:
// no-preference`, so with reduced motion the content is visible immediately and
// this component is a no-op visually.
export function Reveal({
  as: Tag = 'div',
  stagger = false,
  className = '',
  children,
}: {
  as?: ElementType;
  stagger?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // If the OS asks for reduced motion, reveal immediately and skip observing.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect(); // reveal once, then stop watching
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const base = stagger ? 'reveal-stagger' : 'reveal';

  return (
    <Tag
      ref={ref as never}
      className={`${base} ${className}`}
      data-visible={visible ? 'true' : 'false'}
    >
      {children}
    </Tag>
  );
}
