import type { Metadata } from 'next';
import { cloudinaryImage } from '@/lib/cloudinary-url';
import { Band } from '@/components/band';
import { Reveal } from '@/components/reveal';
import { CardGrid } from '@/components/card-grid';
import { ContentCard } from '@/components/content-card';

// Learning Process (PRD 17). Public, static prose, NO data access — the sections
// below are STATIC-IN-CODE (Decision 10), the same category as About: the
// institution's stable description of how it teaches, not something the office
// edits monthly. There is no table, no admin module, and no Supabase read here.
//
// Structurally this is the Scholarships page minus the query: Band → eyebrow →
// h1 → lead, then CardGrid variant="text" of title+body ContentCards.

const TITLE = 'Learning Process';
const DESCRIPTION =
  'How students at Modern College & School grow beyond the classroom — field visits and internships, clubs and co-curricular activities, and the school publications that carry their work.';

// Open Graph per PRD 10.6 — a shared link renders as an official card. This page
// has no images of its own, so the card falls back to the institution logo. This
// is the ONLY Cloudinary call in the module, and it is metadata, not page media.
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    images: cloudinaryImage(
      process.env.CLOUDINARY_CLOUD_NAME ?? '',
      'modern/logo1',
      'c_pad,b_white,w_1200,h_630',
    ),
  },
};

// The three sections, in the order the school presents them. Text only: the old
// site carried one photo per section, but those are not in Cloudinary yet.
//
// If the school later supplies real photos, add an optional `image` public id
// here and pass it to ContentCard as `media={{ cloudName, publicId, alt }}` —
// then switch the grid below to variant="media", which is the variant sized for
// image + title + body cards. Do NOT point these at the shared filler image: a
// missing photo should stay absent rather than become decoration.
const SECTIONS: { id: string; title: string; body: string }[] = [
  {
    id: 'field-visits',
    title: 'Field visits and internship',
    body: 'Students are provided with practical exposure through field visits. Meritorious students are also sent for internships at various related institutions.',
  },
  {
    id: 'activities',
    title: 'Extra-curricular activities & clubs',
    body: 'Modern students are encouraged to take an active part in extra and co-curricular activities for their overall development. The Student Quality Circle (SQC) Club, Sports Club, Social Club, and Music Club are all active in the school, each organising programmes throughout the year.',
  },
  {
    id: 'publications',
    title: 'School publications',
    body: 'The literary wall and annual magazine publish student work — essays, poems, artwork, and short stories. The literary wall is updated monthly; the annual magazine is published as a book at the end of each academic year.',
  },
];

export default function LearningProcessPage() {
  return (
    <Band tone="paper">
      <Reveal>
        <p className="text-eyebrow uppercase tracking-wide text-green-brand">
          Life at Modern
        </p>
        <h1 className="mt-2 max-w-2xl font-display text-h1 text-green-ink">
          {TITLE}
        </h1>
        <p className="mt-4 max-w-2xl text-lead text-ink-muted">
          How students grow beyond the classroom — through practical exposure,
          activities, and their own work.
        </p>
      </Reveal>

      {/* A single Reveal fades the whole grid in; ContentCards must be direct
          grid children for subgrid, so per-card stagger is not used. */}
      <Reveal className="mt-12">
        <CardGrid variant="text">
          {SECTIONS.map((section) => (
            <ContentCard
              key={section.id}
              // `media` and `meta` are OMITTED, not null — this page has no
              // images and these sections carry no date or category. Omitted
              // slots render as zero-height placeholders, which keeps the
              // five-slot subgrid intact.
              title={section.title}
              body={<p className="text-small text-ink-muted">{section.body}</p>}
            />
          ))}
        </CardGrid>
      </Reveal>
    </Band>
  );
}
