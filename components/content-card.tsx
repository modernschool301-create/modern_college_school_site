import type { ReactNode } from 'react';
import Link from 'next/link';
import { cloudinaryImage, FILLER_IMAGE } from '@/lib/cloudinary-url';

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
//   • { publicId: null }   → the shared FILLER_IMAGE, through the SAME 4:3
//                            transform, so a filler card and a real card are
//                            identical in shape.
type Media = {
  cloudName: string;
  publicId: string | null;
  alt: string;
};

function renderMedia(media: Media | undefined, isLink: boolean): ReactNode {
  // Omitted: a bare placeholder keeps the child count at five while collapsing
  // to zero height (no aspect-ratio, no padding).
  if (!media) return <div aria-hidden="true" />;

  // No cover of its own → the shared filler, through the same transform as a
  // real cover (identical 4:3 crop, same optimized delivery).
  const isFiller = !media.publicId;
  const src = cloudinaryImage(
    media.cloudName,
    media.publicId ?? FILLER_IMAGE,
    'c_fill,ar_4:3,w_800',
  );

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="content-card__media"
      src={src}
      // The filler says nothing about this particular card, so it is purely
      // decorative — always alt="" regardless of the supplied alt. Otherwise:
      // on a link card the title carries the accessible name, so the image is
      // decorative there too (empty alt) to avoid a doubled announcement; on a
      // non-link card the supplied alt is meaningful text (§11).
      alt={isFiller || isLink ? '' : media.alt}
      loading="lazy"
    />
  );
}

// RETIRED, kept deliberately: the no-image branded panel (§9 "green as frame") —
// a --green-forest panel carrying the title in --paper. Superseded by the filler
// image above. If repeated fillers read badly down a column, restore by swapping
// the `isFiller` branch back to this and re-suppressing the title slot (see
// `titleSlot` below), since this panel shows the title itself:
//
//   if (!media.publicId) {
//     return (
//       <div className="content-card__cover">
//         {title ? <h2>{title}</h2> : null}
//       </div>
//     );
//   }
//
// Its styles (.content-card__cover, .content-card__cover h2) stay in globals.css.

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

  // The media slot no longer shows the title (the filler replaced the panel
  // that did), so the title slot is never suppressed — a card with no cover
  // now renders the filler image AND its own title, and keeps its <h2> in the
  // heading outline. Restoring the retired panel means restoring this
  // suppression too, or the title would appear twice.
  const titleSlot = title;

  const children = (
    <>
      {renderMedia(media, isLink)}

      {meta ? <div className="content-card__slot">{meta}</div> : <div />}

      {/* The card title is an <h2> so each card is a stop in the heading
          outline under the page's single <h1> (§11). When there is no title
          (a testimonial, where the quote is the body) the placeholder stays a
          plain div — an empty heading is worse than none.
          `text-h3` already pins size/leading/weight over the global h1–h6 base
          rule; `text-wrap` cancels the one thing it doesn't, that rule's
          text-wrap:balance, so the title wraps exactly as it did as a div. */}
      {titleSlot ? (
        <h2 className="content-card__slot font-display text-h3 text-green-ink text-wrap">
          {titleSlot}
        </h2>
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
