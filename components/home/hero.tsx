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
  // Default to the VIDEO so the real <video> element is in the server-rendered
  // output (and plays as soon as the page hydrates on capable devices). We only
  // DOWNGRADE to the poster still for reduced-motion, small screens, or slow
  // connections — the cases where a heavy autoplaying video hurts more than it
  // helps (design_system.md Section 6 & 7).
  const [showVideo, setShowVideo] = useState(true);

  useEffect(() => {
    if (!media.hasMedia) {
      setShowVideo(false);
      return;
    }

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

    // Reduced motion / mobile / data-saver → show the poster still instead.
    if (reducedMotion || smallScreen || slowConnection) {
      setShowVideo(false);
    }
  }, [media.hasMedia]);

  return (
    <section data-hero className="w-full bg-green-forest">
      <div className="grid md:min-h-[88vh] md:grid-cols-2">
        {/* LEFT — solid green message panel. Extra TOP padding (pt-28) clears
            the overlaid fixed nav (--nav-height: 80px) so the headline is never
            hidden under it; on desktop the panel is tall and vertically centred,
            so the clearance is comfortable there too. */}
        <div className="flex items-center bg-green-forest px-6 pb-16 pt-28 sm:px-10 lg:px-16">
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
            (showVideo ? (
              // A real <video> (NOT the poster still). The .mp4 source is the
              // Cloudinary VIDEO delivery URL; poster= the so_0 .jpg still shows
              // instantly while it loads and stays put if autoplay is blocked,
              // so the hero is never blank.
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
              // Poster fallback for reduced-motion / mobile / slow connections.
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
