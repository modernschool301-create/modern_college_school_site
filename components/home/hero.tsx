'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { HeroMedia } from '@/lib/cloudinary-url';

// Split hero (design_system.md Section 7, adapted): a solid deep-green panel
// carries the message, the video fills the other half. Because the text lives on
// the SOLID panel, legibility NEVER depends on the video — the whole point of the
// split. On mobile the two stack (panel on top, 16:9 video below) and never
// overlap, which fixes the old text/menu collision.
export function Hero({ media }: { media: HeroMedia }) {
  const [playVideo, setPlayVideo] = useState(false);

  useEffect(() => {
    if (!media.hasMedia) return;

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const smallScreen = window.matchMedia('(max-width: 767px)').matches;

    const conn = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }
    ).connection;
    const slowConnection = Boolean(
      conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType ?? '')),
    );

    // Autoplay is unreliable on mobile, so there we always use the poster.
    if (!reducedMotion && !smallScreen && !slowConnection) {
      setPlayVideo(true);
    }
  }, [media.hasMedia]);

  return (
    <section data-hero className="w-full bg-green-forest">
      <div className="grid md:min-h-[88vh] md:grid-cols-2">
        {/* LEFT — solid green message panel */}
        <div className="flex items-center bg-green-forest px-6 py-16 sm:px-10 lg:px-16">
          <div className="max-w-xl">
            <p className="text-eyebrow uppercase tracking-wide text-green-pale">
              Bhaktapur&apos;s trusted choice for +2 &amp; Bachelor&apos;s
              education
            </p>

            <h1 className="mt-4 font-display text-hero text-white">
              Education for peace and prosperity, since 1993.
            </h1>

            <p className="mt-5 text-lead text-green-pale">
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
        </div>

        {/* RIGHT — video half. 16:9 on mobile, fills the panel height on desktop.
            green-ink base so it's never a blank/black area while media loads. */}
        <div className="relative aspect-video bg-green-ink md:aspect-auto">
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
        </div>
      </div>
    </section>
  );
}
