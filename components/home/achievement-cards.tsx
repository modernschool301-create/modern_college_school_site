'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ContentCard } from '@/components/content-card';
import { NPT_DATE } from '@/lib/dates';
import {
  DialogCloseButton,
  ScrollableCardDialog,
} from './scrollable-card-dialog';

// The achievements cards and the ONE dialog they share (homepage teaser).
//
// The mechanism — scroll track, single dialog, focus return, the conditional
// "scroll for more" line — is ScrollableCardDialog's, the same instance of it
// Leadership uses. What is specific to achievements is here: the card face, the
// dialog panel, and the trigger label.
//
// The card face carries ONLY the photo and the title. The date and the
// description are the reason to open the dialog; putting a preview of either on
// the face makes the trigger look like it leads somewhere the visitor has
// already been. The full list at /achievements is the place that shows
// everything at once — this is a teaser.

export type AchievementCardData = {
  id: string;
  title: string;
  description: string | null;
  image: string | null;
  achieved_on: string | null;
};

// The single definition of "has something to expand to", matching Leadership's
// rule: a whitespace-only description is nothing, exactly like null.
function hasDescription(achievement: AchievementCardData): boolean {
  return Boolean(achievement.description && achievement.description.trim());
}

export function AchievementCards({
  achievements,
  cloudName,
}: {
  achievements: AchievementCardData[];
  cloudName: string;
}) {
  return (
    <ScrollableCardDialog
      items={achievements}
      getId={(achievement) => achievement.id}
      eyebrow="Recognition"
      heading="What our students and staff have won"
      helperText="Scroll to see more of what our students and staff have achieved."
      trackLabel="Achievements, horizontally scrollable"
      prevLabel="Show previous achievements"
      nextLabel="Show next achievements"
      triggerLabel="Read full description"
      // N identical "Read full description" buttons are ambiguous read out of
      // context, so each names its own achievement.
      getTriggerAriaLabel={(achievement) =>
        `Read the full description of ${achievement.title}`
      }
      // No description → no button, the same rule Leadership applies to a
      // missing full message.
      isExpandable={hasDescription}
      renderCard={(achievement, trigger) => (
        <ContentCard
          media={{
            cloudName,
            // Null image → the shared FILLER_IMAGE, through the same 4:3
            // transform (ContentCard handles both).
            publicId: achievement.image,
            alt: achievement.title,
          }}
          title={achievement.title}
          footer={trigger}
        />
      )}
      renderDialog={(achievement, headingId) => (
        <div className="flex min-h-0 flex-auto flex-col">
          <div className="flex items-start gap-4 border-b border-line p-6">
            <div className="min-w-0 flex-1">
              <h2 id={headingId} className="font-display text-h3 text-green-ink">
                {achievement.title}
              </h2>
              {/* Undated achievements exist (an ongoing recognition, a row the
                  admin left blank), so the line is omitted rather than shown
                  empty. Nepal time, via the shared formatter. */}
              {achievement.achieved_on && (
                <p className="mt-1 text-small text-green-brand">
                  {NPT_DATE.format(new Date(achievement.achieved_on))}
                </p>
              )}
            </div>

            <DialogCloseButton />
          </div>

          {/* The only scrolling region: a long description scrolls inside the
              panel, the header stays put, and the page behind never moves.
              Description stays MARKDOWN (bold, lists, links) in .rich-text —
              the same rendering /achievements gives it. */}
          <div className="min-h-0 flex-auto overflow-y-auto p-6">
            <div className="rich-text">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {achievement.description ?? ''}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    />
  );
}
