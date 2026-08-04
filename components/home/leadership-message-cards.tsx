'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ContentCard } from '@/components/content-card';
import { Reveal } from '@/components/reveal';
import { cloudinaryImage } from '@/lib/cloudinary-url';

// The leadership cards and the ONE dialog they share (Leadership Messages).
//
// The cards are the SHARED system, not a bespoke card: ContentCard, so a
// leadership row lines up slot-for-slot with an achievement or an admission
// form and inherits the same hover, radius, and subgrid alignment. Only two
// things are specific to this module — the face-aware crop (a portrait
// centre-cropped 4:3 loses the head) and the footer button.
//
// The CONTAINER, though, is this module's own: a horizontal scroll track
// (.leadership-track in globals.css) rather than CardGrid's wrapping grid, so
// five leaders cost one row of homepage height instead of two and a sixth costs
// nothing. It is still a grid — see the CSS for why a flex row would break the
// cards' subgrid — so nothing about the cards themselves changes.
//
// The scroller is VISIBLE, on purpose and in three ways: a branded scrollbar
// rail under the cards (the CSS), the next card peeking past the right edge on
// mobile, and the prev/next buttons below. A silent overflow that only reveals
// itself if you happen to swipe is a section whose second half nobody reads.
// The buttons are an ADDITION to scrolling, never a replacement — wheel, swipe,
// drag, and arrow keys all still work if they are never touched.
//
// The DIALOG is mounted once here, at the list level, not once per card. Many
// cards, one dialog: `openId` says which message is showing, and the trigger
// refs remember which button opened it so focus returns to THAT button and not
// merely to the first one on the page.
//
// Mechanics are the Gallery lightbox's, deliberately: a native <dialog> opened
// with showModal(), so the BROWSER owns the focus trap (Tab and Shift+Tab cycle
// inside), the top layer, the inertness — and the scroll lock — of the page
// behind, and Escape-to-close. The only focus work left here is RESTORING it on
// close, done explicitly because the grid re-renders underneath.

export type LeadershipCardData = {
  id: string;
  name: string;
  title: string;
  photo: string | null;
  excerpt: string;
  full_message: string | null;
};

// The single definition of "has something to expand to". A whitespace-only body
// is nothing, exactly like null — the admin left the field empty.
function hasFullMessage(message: LeadershipCardData): boolean {
  return Boolean(message.full_message && message.full_message.trim());
}

// The widest the track ever shows at once (the 1024px step in .leadership-track).
// Used only to SEED the control state for the server render, so a homepage with
// more leaders than this ships its buttons in the HTML instead of popping them
// in after hydration. The real answer is measured on mount.
const MAX_CARDS_IN_VIEW = 3;

function ScrollChevron({ direction }: { direction: 'prev' | 'next' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={direction === 'prev' ? 'M10 3 5 8l5 5' : 'M6 3l5 5-5 5'} />
    </svg>
  );
}

export function LeadershipMessageCards({
  messages,
  cloudName,
}: {
  messages: LeadershipCardData[];
  cloudName: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Keyed by message id rather than by index: only the messages that HAVE a
  // full message own a button, so positions in this map are sparse and an
  // index would drift against the rendered order.
  const triggerRefs = useRef(new Map<string, HTMLButtonElement | null>());
  // The button that OPENED the dialog. Read on close, so focus lands back on
  // the card the visitor came from.
  const triggerIdRef = useRef<string | null>(null);
  const headingId = useId();

  // ── The visible scroller's state ──────────────────────────────────────────
  const trackRef = useRef<HTMLDivElement>(null);
  const trackId = useId();
  // Seeded from the row count so the server render already carries the controls
  // when there are certainly too many cards to fit; corrected by measurement on
  // mount, which is the only thing that knows the actual viewport (two cards
  // overflow a phone, three do not overflow a desktop).
  const overflowLikely = messages.length > MAX_CARDS_IN_VIEW;
  const [scrollable, setScrollable] = useState(overflowLikely);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(overflowLikely);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const measure = () => {
      // 1px of slack: scrollWidth/clientWidth are rounded, so an exactly-fitting
      // track can report a sub-pixel overflow and light up a button that does
      // nothing.
      const max = track.scrollWidth - track.clientWidth;
      setScrollable(max > 1);
      setCanScrollPrev(track.scrollLeft > 1);
      setCanScrollNext(track.scrollLeft < max - 1);
    };

    // ResizeObserver fires once on observe with the current size, so that first
    // callback IS the initial measurement — no synchronous measure() here, and
    // no reading layout during render.
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    track.addEventListener('scroll', measure, { passive: true });
    return () => {
      observer.disconnect();
      track.removeEventListener('scroll', measure);
    };
  }, [messages.length]);

  // One card + one gap per press, read from the DOM rather than hardcoded — the
  // card width is a percentage that changes at two breakpoints, and the gap is a
  // token. Snapping then settles the landing position exactly.
  const scrollByCard = useCallback((direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.firstElementChild as HTMLElement | null;
    const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
    const step = card ? card.getBoundingClientRect().width + gap : track.clientWidth;
    track.scrollBy({
      left: direction * step,
      // The track already carries `scroll-behavior: smooth` only under
      // no-preference, but scrollBy's own option overrides that rule, so the
      // preference is honoured here too rather than silently animating.
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    });
  }, []);

  // State drives the dialog rather than the other way round: showModal()/close()
  // are imperative, so they are reconciled here in one place.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (openId !== null && !dialog.open) dialog.showModal();
    else if (openId === null && dialog.open) dialog.close();
  }, [openId]);

  // The single close path. The native `close` event fires for Escape, for the
  // Close button, and for a backdrop click alike, so focus restoration lives
  // here once instead of at three call sites.
  const handleClose = useCallback(() => {
    setOpenId(null);
    const triggerId = triggerIdRef.current;
    if (triggerId) triggerRefs.current.get(triggerId)?.focus();
  }, []);

  const open = openId === null ? null : messages.find((m) => m.id === openId);

  return (
    <>
      {/* The Reveal wraps the TRACK AND ITS CONTROLS, and the dialog is its
          sibling — never its descendant. `.reveal` carries a transform and a
          standing will-change, which are exactly the properties that create a
          containing block for positioned descendants; a top-layer dialog is
          specified to escape that, but there is no reason to make the panel
          depend on it. One Reveal fades the whole track in: ContentCards must be
          DIRECT grid children for subgrid, so per-card stagger is not used. */}
      <Reveal className="mt-10">
        {/* A scroll container is not reachable or operable from the keyboard on
            its own, so it is given a tab stop and a name: tabindex=0 makes the
            arrow keys scroll it, role="region" + aria-label make a screen reader
            announce what it is and that it moves sideways (Section 11). The
            cards' own buttons keep their separate tab stops after it, and the
            browser scrolls a focused off-screen card into view natively —
            snapping never fights that, because every card is a snap point. */}
        <div
          ref={trackRef}
          id={trackId}
          role="region"
          aria-label="Leadership messages, horizontally scrollable"
          tabIndex={0}
          className="leadership-track"
        >
          {messages.map((message) => {
            const expandable = hasFullMessage(message);
            return (
              <ContentCard
                key={message.id}
                media={{
                  cloudName,
                  // Null photo → the shared FILLER_IMAGE, through the same 4:3
                  // transform (ContentCard handles both).
                  publicId: message.photo,
                  alt: `Photo of ${message.name}`,
                  // Face-aware so a portrait keeps its head in frame.
                  gravity: 'g_face',
                }}
                // The name is the card's <h2> — this section's stop in the
                // page heading outline.
                title={message.name}
                meta={
                  <p className="text-small text-green-brand">{message.title}</p>
                }
                body={
                  <p className="text-small text-ink-muted">{message.excerpt}</p>
                }
                // No full message → NO footer at all, not a disabled or dead
                // button. There is nothing to expand to, so there is nothing to
                // offer. ContentCard renders the empty slot as a zero-height
                // placeholder, so the card still aligns with its neighbours.
                footer={
                  expandable ? (
                    <button
                      type="button"
                      ref={(el) => {
                        triggerRefs.current.set(message.id, el);
                      }}
                      onClick={() => {
                        triggerIdRef.current = message.id;
                        setOpenId(message.id);
                      }}
                      // Three identical "Read full message" buttons are
                      // ambiguous read out of context, so each names its own
                      // person.
                      aria-label={`Read the full message from ${message.name}`}
                      className="text-small font-medium text-green-brand hover:underline"
                    >
                      Read full message <span aria-hidden="true">→</span>
                    </button>
                  ) : undefined
                }
              />
            );
          })}
        </div>

        {/* The controls sit BELOW the track, directly under the rail they drive,
            and appear only when there is genuinely something off-screen —
            measured, not guessed, so they are never two dead buttons.
            Each end disables rather than hides its button: a control that
            vanishes at the end of the row moves the other one under the
            visitor's cursor mid-press. */}
        {scrollable && (
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => scrollByCard(-1)}
              disabled={!canScrollPrev}
              aria-controls={trackId}
              aria-label="Show previous leadership messages"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-green-brand transition-colors hover:border-green-pale hover:bg-green-mist disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:bg-surface"
            >
              <ScrollChevron direction="prev" />
            </button>
            <button
              type="button"
              onClick={() => scrollByCard(1)}
              disabled={!canScrollNext}
              aria-controls={trackId}
              aria-label="Show next leadership messages"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-green-brand transition-colors hover:border-green-pale hover:bg-green-mist disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:bg-surface"
            >
              <ScrollChevron direction="next" />
            </button>
          </div>
        )}
      </Reveal>

      <dialog
        ref={dialogRef}
        onClose={handleClose}
        // A click that lands on the dialog element itself is a click on the
        // backdrop area — the content below stops propagation by being a child.
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close();
        }}
        aria-labelledby={headingId}
        className="leadership-dialog"
      >
        {open && (
          <div className="flex min-h-0 flex-auto flex-col">
            <div className="flex items-start gap-4 border-b border-line p-6">
              {/* No portrait → no avatar at all, rather than a filler: the card
                  the visitor just clicked already showed the filler, and
                  repeating it inside the panel says nothing. Decorative
                  (alt="") because the name sits immediately beside it. */}
              {open.photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cloudinaryImage(
                    cloudName,
                    open.photo,
                    'c_fill,g_face,ar_1:1,w_160',
                  )}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-full border border-line object-cover"
                />
              )}

              <div className="min-w-0 flex-1">
                <h2
                  id={headingId}
                  className="font-display text-h3 text-green-ink"
                >
                  {open.name}
                </h2>
                <p className="mt-1 text-small text-green-brand">{open.title}</p>
              </div>

              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="shrink-0 rounded-sm border border-line px-3 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:bg-green-mist hover:text-ink"
              >
                Close
              </button>
            </div>

            {/* The only scrolling region: a long message scrolls inside the
                panel, the header stays put, and the page behind never moves. */}
            <div className="min-h-0 flex-auto overflow-y-auto p-6">
              <div className="rich-text">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {open.full_message ?? ''}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
