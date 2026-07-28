'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Container } from '@/components/container';
import type { HeroMedia } from '@/lib/cloudinary-url';

// The signature element (design_system.md Section 7). Full-bleed, edge-to-edge,
// green-forest base so it looks complete even before any media paints. The
// video is an ENHANCEMENT: on reduced-motion, small screens, or data-saver we
// show only the poster still.
export function Hero({ media }: { media: HeroMedia }) {
  const [playVideo, setPlayVideo] = useState(false);

  useEffect(() => {
    if (!media.hasMedia) return;

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const smallScreen = window.matchMedia('(max-width: 640px)').matches;

    // navigator.connection is non-standard; treat data-saver / 2g as "slow".
    const conn = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }
    ).connection;
    const slowConnection = Boolean(
      conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType ?? '')),
    );

    if (!reducedMotion && !smallScreen && !slowConnection) {
      setPlayVideo(true);
    }
  }, [media.hasMedia]);

  return (
    <section
      data-hero
      className="relative flex min-h-[88vh] w-full items-center overflow-hidden bg-green-forest"
    >
      {/* Media layer: poster still by default; the video swaps in only when
          conditions allow. The poster is always the paint-safe fallback. */}
      {media.hasMedia &&
        (playVideo ? (
          <video
            className="absolute inset-0 h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={media.posterUrl}
            src={media.videoUrl}
            aria-hidden="true"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="absolute inset-0 h-full w-full object-cover"
            src={media.posterUrl}
            alt=""
            aria-hidden="true"
          />
        ))}

      {/* Green gradient scrim (design_system.md Section 2): over the video,
          under the text. Guarantees legibility and is the boldest brand-green
          moment on the site. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(105deg, rgba(14,42,28,0.88) 0%, rgba(18,61,42,0.66) 45%, rgba(18,61,42,0.30) 100%)',
        }}
      />

      {/* Content */}
      <Container className="relative z-10 py-28">
        <div className="max-w-2xl">
          <p className="text-eyebrow uppercase tracking-wide text-green-pale">
            Bhaktapur&apos;s trusted choice for +2 &amp; Bachelor&apos;s education
          </p>

          <h1 className="mt-4 font-display text-hero text-white">
            Education for peace and prosperity, since 1993.
          </h1>

          <p className="mt-5 max-w-xl text-lead text-green-pale">
            A modern +2 and Bachelor&apos;s institution in Bhaktapur, shaping
            capable graduates for three decades.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/admissions" className="btn-primary">
              Apply now
            </Link>
            <Link
              href="/programmes"
              className="inline-flex items-center rounded-sm border border-white/50 px-6 py-3 font-medium text-white transition-colors hover:bg-white/10"
            >
              Explore programmes
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
