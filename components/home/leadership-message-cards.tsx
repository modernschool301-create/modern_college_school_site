'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ContentCard } from '@/components/content-card';
import { cloudinaryImage } from '@/lib/cloudinary-url';
import {
  DialogCloseButton,
  ScrollableCardDialog,
} from './scrollable-card-dialog';

// The leadership cards and the ONE dialog they share (Leadership Messages).
//
// The scroll track, the shared dialog, the focus-return bookkeeping and the
// conditional "scroll for more" line all live in ScrollableCardDialog now —
// this file is what is SPECIFIC to leadership: the heading copy, the card face,
// the dialog panel, and the rule for what counts as expandable.
//
// The cards are the SHARED system, not a bespoke card: ContentCard, so a
// leadership row lines up slot-for-slot with an achievement or an admission
// form and inherits the same hover, radius, and subgrid alignment. Only two
// things are specific to this module — the face-aware crop (a portrait
// centre-cropped 4:3 loses the head) and the footer button.

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

export function LeadershipMessageCards({
  messages,
  cloudName,
}: {
  messages: LeadershipCardData[];
  cloudName: string;
}) {
  return (
    <ScrollableCardDialog
      items={messages}
      getId={(message) => message.id}
      eyebrow="Our leadership"
      heading="A word from the people who lead Modern"
      helperText="Scroll to read more messages from our leadership."
      trackLabel="Leadership messages, horizontally scrollable"
      prevLabel="Show previous leadership messages"
      nextLabel="Show next leadership messages"
      triggerLabel="Read full message"
      // Three identical "Read full message" buttons are ambiguous read out of
      // context, so each names its own person.
      getTriggerAriaLabel={(message) =>
        `Read the full message from ${message.name}`
      }
      // No full message → no button. There is nothing to expand to, so there is
      // nothing to offer.
      isExpandable={hasFullMessage}
      renderCard={(message, trigger) => (
        <ContentCard
          media={{
            cloudName,
            // Null photo → the shared FILLER_IMAGE, through the same 4:3
            // transform (ContentCard handles both).
            publicId: message.photo,
            alt: `Photo of ${message.name}`,
            // Face-aware so a portrait keeps its head in frame.
            gravity: 'g_face',
          }}
          // The name is the card's <h2> — this section's stop in the page
          // heading outline.
          title={message.name}
          meta={<p className="text-small text-green-brand">{message.title}</p>}
          body={<p className="text-small text-ink-muted">{message.excerpt}</p>}
          footer={trigger}
        />
      )}
      renderDialog={(message, headingId) => (
        <div className="flex min-h-0 flex-auto flex-col">
          <div className="flex items-start gap-4 border-b border-line p-6">
            {/* No portrait → no avatar at all, rather than a filler: the card
                the visitor just clicked already showed the filler, and
                repeating it inside the panel says nothing. Decorative
                (alt="") because the name sits immediately beside it. */}
            {message.photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cloudinaryImage(
                  cloudName,
                  message.photo,
                  'c_fill,g_face,ar_1:1,w_160',
                )}
                alt=""
                className="h-16 w-16 shrink-0 rounded-full border border-line object-cover"
              />
            )}

            <div className="min-w-0 flex-1">
              <h2 id={headingId} className="font-display text-h3 text-green-ink">
                {message.name}
              </h2>
              <p className="mt-1 text-small text-green-brand">{message.title}</p>
            </div>

            <DialogCloseButton />
          </div>

          {/* The only scrolling region: a long message scrolls inside the
              panel, the header stays put, and the page behind never moves. */}
          <div className="min-h-0 flex-auto overflow-y-auto p-6">
            <div className="rich-text">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.full_message ?? ''}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    />
  );
}
