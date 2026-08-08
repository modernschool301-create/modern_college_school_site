'use client';

import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Reveal } from '@/components/reveal';

// The shared "horizontal card track + ONE dialog" section body, extracted from
// Leadership Messages so a second homepage module (Achievements) reuses the
// mechanism rather than owning a second copy of it.
//
// The CONTAINER is a horizontal scroll track (.leadership-track in globals.css)
// rather than CardGrid's wrapping grid, so five cards cost one row of homepage
// height instead of two and a sixth costs nothing. It is still a grid — see the
// CSS for why a flex row would break the cards' subgrid — so nothing about the
// cards themselves changes.
//
// The scroller is VISIBLE, on purpose and in three ways: a branded scrollbar
// rail under the cards (the CSS), the next card peeking past the right edge on
// mobile, and the prev/next buttons below. A silent overflow that only reveals
// itself if you happen to swipe is a section whose second half nobody reads.
// The buttons are an ADDITION to scrolling, never a replacement — wheel, swipe,
// drag, and arrow keys all still work if they are never touched.
//
// The DIALOG is mounted once here, at the list level, not once per card. Many
// cards, one dialog: `openId` says which item is showing, and the trigger refs
// remember which button opened it so focus returns to THAT button and not
// merely to the first one on the page.
//
// Mechanics are the Gallery lightbox's, deliberately: a native <dialog> opened
// with showModal(), so the BROWSER owns the focus trap (Tab and Shift+Tab cycle
// inside), the top layer, the inertness — and the scroll lock — of the page
// behind, and Escape-to-close. The only focus work left here is RESTORING it on
// close, done explicitly because the grid re-renders underneath.
//
// This component owns the HEADING BLOCK as well as the track, because the
// "scroll for more" helper line is conditional on the item count and belongs in
// the same Reveal as the heading it qualifies. The consuming SERVER component
// keeps the Band (and therefore the tone) and the data read.
//
// The CSS classes are still named `.leadership-*`: they are verified, live
// styles and renaming them buys nothing but regression risk. They are shared
// styles now, not leadership-specific ones.

// The widest the track ever shows at once (the 1024px step in .leadership-track).
// Used to SEED the control state for the server render — so a homepage with more
// cards than this ships its buttons in the HTML instead of popping them in after
// hydration — and to decide whether the helper line is true. The real answer for
// the buttons is measured on mount.
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

// The dialog panel's Close button, shared by every consumer's `renderDialog`.
// It closes by asking the nearest <dialog> to close rather than by reaching for
// this component's ref, so it works from inside a render prop. Either way the
// native `close` event stays the single close path, and focus restoration runs
// exactly once — the same as Escape and the backdrop.
export function DialogCloseButton() {
  return (
    <button
      type="button"
      onClick={(e) => e.currentTarget.closest('dialog')?.close()}
      className="shrink-0 rounded-sm border border-line px-3 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:bg-green-mist hover:text-ink"
    >
      Close
    </button>
  );
}

export function ScrollableCardDialog<T>({
  items,
  getId,
  eyebrow,
  heading,
  helperText,
  trackLabel,
  prevLabel,
  nextLabel,
  triggerLabel,
  getTriggerAriaLabel,
  isExpandable,
  renderCard,
  renderDialog,
}: {
  items: T[];
  /** Stable id per item — keys the card list, the trigger ref map, and openId. */
  getId: (item: T) => string;
  eyebrow: string;
  heading: string;
  /** Shown only when there are more items than fit in one viewport. */
  helperText: string;
  /** Accessible name for the scroll region itself. */
  trackLabel: string;
  prevLabel: string;
  nextLabel: string;
  /** e.g. "Read full message" / "Read full description". Never hardcoded here. */
  triggerLabel: string;
  /** Per-item accessible name, so N identical triggers are distinguishable. */
  getTriggerAriaLabel: (item: T) => string;
  /** False → the item gets NO trigger button at all (nothing to expand to). */
  isExpandable: (item: T) => boolean;
  /** The card face. `trigger` is the ready-made footer button, or undefined. */
  renderCard: (item: T, trigger: ReactNode | undefined) => ReactNode;
  /** The dialog body for the open item. Must label itself with `headingId`. */
  renderDialog: (item: T, headingId: string) => ReactNode;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Keyed by item id rather than by index: only the items that HAVE something
  // to expand own a button, so positions in this map are sparse and an index
  // would drift against the rendered order.
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
  const overflowLikely = items.length > MAX_CARDS_IN_VIEW;
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
  }, [items.length]);

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

  const open =
    openId === null ? null : items.find((item) => getId(item) === openId);

  return (
    <>
      <Reveal>
        <p className="text-eyebrow uppercase tracking-wide text-green-brand">
          {eyebrow}
        </p>
        <h2 className="mt-2 max-w-2xl font-display text-h2 text-green-ink">
          {heading}
        </h2>

        {/* Only when there is something off-screen to reach. Three cards is the
            widest the track shows at once, so at three or fewer the row does
            not scroll and a line telling the visitor to scroll it would be a
            lie. The count is the published rows, the same set the track gets. */}
        {items.length > MAX_CARDS_IN_VIEW && (
          <p className="mt-3 text-small text-ink-muted">{helperText}</p>
        )}
      </Reveal>

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
          aria-label={trackLabel}
          tabIndex={0}
          className="leadership-track"
        >
          {items.map((item) => {
            const id = getId(item);
            // Nothing to expand to → NO footer at all, not a disabled or dead
            // button. ContentCard renders the empty slot as a zero-height
            // placeholder, so the card still aligns with its neighbours.
            const trigger = isExpandable(item) ? (
              <button
                type="button"
                ref={(el) => {
                  triggerRefs.current.set(id, el);
                }}
                onClick={() => {
                  triggerIdRef.current = id;
                  setOpenId(id);
                }}
                // N identical trigger labels are ambiguous read out of context,
                // so each names its own item.
                aria-label={getTriggerAriaLabel(item)}
                className="text-small font-medium text-green-brand hover:underline"
              >
                {triggerLabel} <span aria-hidden="true">→</span>
              </button>
            ) : undefined;

            // A keyed Fragment, NOT a wrapper element: the card has to stay a
            // DIRECT DOM child of the track. `.leadership-track > .content-card`
            // (scroll-snap-align) is a DOM relationship no `display: contents`
            // wrapper would satisfy, and subgrid placement reads the same tree.
            return <Fragment key={id}>{renderCard(item, trigger)}</Fragment>;
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
              aria-label={prevLabel}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-green-brand transition-colors hover:border-green-pale hover:bg-green-mist disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:bg-surface"
            >
              <ScrollChevron direction="prev" />
            </button>
            <button
              type="button"
              onClick={() => scrollByCard(1)}
              disabled={!canScrollNext}
              aria-controls={trackId}
              aria-label={nextLabel}
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
        {open && renderDialog(open, headingId)}
      </dialog>
    </>
  );
}
