import type { ReactNode } from 'react';
import Link from 'next/link';
import { cloudinaryImage } from '@/lib/cloudinary-url';

// The shared content card (design_system.md §8/§9). It renders as a SUBGRID that
// spans five parent rows, so cards in a row align slot-for-slot without fixed
// heights (see .content-card in globals.css).
//
// Every card renders EXACTLY five direct grid children, in this fixed order —
// media, meta, title, body, footer — because subgrid aligns by track: a card
// that omitted a slot would shift its later slots into the wrong tracks. Absent
// slots render as an empty placeholder that collapses to zero height, never
// omitted.
//
// `media`:
//   • undefined            → omitted (text cards); zero-height placeholder.
//   • { publicId: string } → the image, 4:3, through a resizing transform.
//   • { publicId: null }   → the NO-IMAGE cover panel (§9 "green as frame"): a
//                            --green-forest panel carrying the title in --paper,
//                            not an empty frame and not a logo stand-in.
type Media = {
  cloudName: string;
  publicId: string | null;
  alt: string;
};

function renderMedia(
  media: Media | undefined,
  title: ReactNode,
  isLink: boolean,
): ReactNode {
  // Omitted: a bare placeholder keeps the child count at five while collapsing
  // to zero height (no aspect-ratio, no padding).
  if (!media) return <div aria-hidden="true" />;

  if (media.publicId) {
    const src = cloudinaryImage(
      media.cloudName,
      media.publicId,
      'c_fill,ar_4:3,w_800',
    );
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className="content-card__media"
        src={src}
        // On a link card the title carries the accessible name, so the image is
        // decorative (empty alt) to avoid a doubled announcement; otherwise the
        // supplied alt is meaningful text (§11).
        alt={isLink ? '' : media.alt}
        loading="lazy"
      />
    );
  }

  // No-image cover panel showing the title.
  return (
    <div className="content-card__cover">
      <span>{title}</span>
    </div>
  );
}

export function ContentCard({
  media,
  meta,
  title,
  body,
  footer,
  href,
}: {
  media?: Media;
  meta?: ReactNode;
  title?: ReactNode;
  body?: ReactNode;
  footer?: ReactNode;
  href?: string;
}) {
  const isLink = Boolean(href);

  // The cover panel already shows the title, so a cover card suppresses the
  // separate title slot to avoid duplicating it.
  const isCover = media != null && media.publicId === null;
  const titleSlot = isCover ? null : title;

  const children = (
    <>
      {renderMedia(media, title, isLink)}

      {meta ? <div className="content-card__slot">{meta}</div> : <div />}

      {titleSlot ? (
        <div className="content-card__slot font-display text-h3 text-green-ink">
          {titleSlot}
        </div>
      ) : (
        <div />
      )}

      {body ? <div className="content-card__slot">{body}</div> : <div />}

      {footer ? (
        <div className="content-card__footer">{footer}</div>
      ) : (
        <div />
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className="content-card">
        {children}
      </Link>
    );
  }

  return <article className="content-card">{children}</article>;
}
