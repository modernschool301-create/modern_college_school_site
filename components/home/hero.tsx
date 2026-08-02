'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { HeroMedia } from '@/lib/cloudinary-url';

// Split hero (design_system.md Section 7, adapted): a solid deep-green panel
// carries the message, the video fills the other half. Because the text lives on
// the SOLID panel, legibility NEVER depends on the video — the whole point of the
// split. On mobile the two stack (panel on top, 16:9 video below) and never
// overlap, which fixes the old text/menu collision.
//
// The join between panel and video is a diagonal, not a straight line: a solid
// --green-forest BASE spans the whole hero and the media layer sits on top of it,
// cut back on a gentle rake. The edge is deliberately SHARP — no gradient, no
// dissolve. The mechanics and the numbers live in app/globals.css
// (`.hero-media`), because the diagonal has to be re-derived for the stacked
// layout and that is a media query, not a utility class.
export function Hero({ media }: { media: HeroMedia }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Attempt the video on ALL devices, mobile included. The poster is the SAFETY
  // NET — shown only when there is no media, prefers-reduced-motion is set, or a
  // browser rejects muted autoplay (the play().catch below). It is NOT a blanket
  // mobile block.
  const [showVideo, setShowVideo] = useState(true);

  useEffect(() => {
    if (!media.hasMedia) {
      setShowVideo(false);
      return;
    }

    // Reduced motion → poster still, no autoplay.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShowVideo(false);
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    // muted MUST be set as a PROPERTY (not merely the attribute) or mobile
    // browsers block inline autoplay.
    video.muted = true;

    // Try to autoplay; if the browser still refuses, drop to the poster rather
    // than leaving a blank/frozen area.
    const attempt = video.play();
    if (attempt && typeof attempt.catch === 'function') {
      attempt.catch(() => setShowVideo(false));
    }

    // TODO(data-saver): a considerate enhancement could autoplay on wifi and
    // show the poster on metered/cellular connections via the Network
    // Information API / Save-Data hint (navigator.connection.saveData /
    // effectiveType). Not built now.
  }, [media.hasMedia]);

  return (
    // `relative` only establishes the containing block for the layers inside;
    // the section's own bg-green-forest IS the base layer, and the grid below
    // still owns the height exactly as before (88vh floor on desktop, panel +
    // 16:9 band when stacked) — site-nav.tsx measures this element's
    // offsetHeight to decide when to go solid, so that must not move.
    <section data-hero className="relative w-full bg-green-forest">
      <div className="grid md:min-h-[88vh] md:grid-cols-2">
        {/* LEFT — the message, in its own layer ABOVE the media (z-10) and with
            NO background of its own: the base already supplies the green, and an
            opaque panel here would paint over the part of the video that reaches
            back past the centre line. Extra TOP padding (pt-28) clears the
            overlaid fixed nav (--nav-height: 80px) so the headline is never
            hidden under it; on desktop the panel is tall and vertically centred,
            so the clearance is comfortable there too. */}
        <div className="relative z-10 flex items-center px-6 pb-16 pt-28 sm:px-10 lg:px-16">
          <div className="max-w-xl">
            <p className="text-eyebrow uppercase tracking-wide text-green-pale">
              Bhaktapur&apos;s trusted choice for secondary, +2 &amp;
              Bachelor&apos;s education
            </p>

            <h1 className="mt-4 font-display text-hero text-white">
              Education for peace and prosperity, since 1993.
            </h1>

            <p className="mt-5 text-lead text-green-pale">
              A premier educational institution in Bhaktapur offering secondary, +2 and Bachelor&apos;s programs
              shaping capable graduates for three decades.
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

        {/* RIGHT — the video half, now a SPACER: it still owns exactly the same
            height it always did (16:9 on mobile, stretched to the row on
            desktop), so the hero's outer height is unchanged, but the media is
            layered on top of it and escapes this box on the diagonal. Its
            green-ink base moved onto that layer (see globals.css) so the cut
            never exposes a second green behind the seam. */}
        <div className="relative aspect-video md:aspect-auto">
          <div className="hero-media" aria-hidden="true">
            {media.hasMedia &&
              (showVideo ? (
                // A real <video> (NOT the poster still). Attempts muted inline
                // autoplay on every device; poster= the so_0 .jpg shows instantly
                // while it loads and stays put if autoplay is ever blocked, so
                // the hero is never blank. The Cloudinary f_auto delivery serves
                // a mobile-decodable format (mp4/H.264) via content negotiation.
                <video
                  ref={videoRef}
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
                // Poster fallback: no media, reduced motion, or autoplay rejected.
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
      </div>
    </section>
  );
}
