import type { Metadata } from 'next';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createClient } from '@/lib/supabase/server';
import { cloudinaryImage } from '@/lib/cloudinary-url';
import { Band } from '@/components/band';
import { Reveal } from '@/components/reveal';
import { CardGrid } from '@/components/card-grid';
import { ContentCard } from '@/components/content-card';
import type { Scholarship } from '@/lib/scholarships';

const TITLE = 'Scholarships';
const DESCRIPTION =
  'Scholarships and financial support available to students of Modern College & School, Bhaktapur.';

// Open Graph per PRD 10.6 — a shared link renders as an official card. This
// module has no images of its own, so the card falls back to the institution
// logo. This is the ONLY Cloudinary call in the module, and it is metadata, not
// page media.
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

type PublicScholarship = Pick<
  Scholarship,
  'id' | 'title' | 'description' | 'criteria'
>;

export default async function ScholarshipsPage() {
  const supabase = await createClient();

  // One read (PRD 16). RLS returns only published rows to the public; the
  // editor-controlled display_order decides the sequence.
  const { data } = await supabase
    .from('scholarships')
    .select('id, title, description, criteria')
    .eq('is_published', true)
    .order('display_order', { ascending: true });

  const scholarships = (data ?? []) as PublicScholarship[];

  return (
    <Band tone="paper">
      <Reveal>
        <p className="text-eyebrow uppercase tracking-wide text-green-brand">
          Support
        </p>
        <h1 className="mt-2 max-w-2xl font-display text-h1 text-green-ink">
          {TITLE}
        </h1>
        <p className="mt-4 max-w-2xl text-lead text-ink-muted">
          Support available to students who earn it, and what each award asks for.
        </p>
      </Reveal>

      {scholarships.length === 0 ? (
        <Reveal className="mt-12 rounded-md border border-line bg-surface p-10 text-center">
          <p className="font-display text-h3 text-green-ink">
            Scholarship details are on their way
          </p>
          <p className="mx-auto mt-3 max-w-md text-ink-muted">
            We are finalising this year&rsquo;s awards and their criteria. In the
            meantime, our admissions page explains how to apply to the college.
          </p>
          <Link
            href="/admissions"
            className="mt-6 inline-block rounded-sm border border-green-brand px-5 py-2.5 text-sm font-medium text-green-brand transition-colors hover:bg-green-mist"
          >
            Read the admission procedure
          </Link>
        </Reveal>
      ) : (
        // A single Reveal fades the whole grid in; ContentCards must be direct
        // grid children for subgrid, so per-card stagger is not used (see Part 1).
        <Reveal className="mt-12">
          <CardGrid variant="text">
            {scholarships.map((scholarship) => (
              <ContentCard
                key={scholarship.id}
                // `media` is OMITTED, not null: this module has no images at
                // all, so there is nothing to fall back to and no filler is
                // wanted. ContentCard renders a zero-height placeholder, which
                // keeps the five-slot subgrid intact. `meta` is likewise unused
                // — a scholarship carries no date or category.
                title={scholarship.title}
                // Description is MARKDOWN, like achievements.
                body={
                  scholarship.description ? (
                    <div className="rich-text text-small">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {scholarship.description}
                      </ReactMarkdown>
                    </div>
                  ) : undefined
                }
                // Criteria sits in the FOOTER so the "who can apply" block is
                // visually separated from the prose and — via subgrid — starts
                // on the same line across every card in the row, however long
                // the descriptions above it run.
                footer={
                  scholarship.criteria ? (
                    <div className="border-t border-line pt-4">
                      <p className="text-eyebrow uppercase tracking-wide text-green-brand">
                        Who can apply
                      </p>
                      <div className="rich-text mt-2 text-small">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {scholarship.criteria}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ) : undefined
                }
              />
            ))}
          </CardGrid>
        </Reveal>
      )}
    </Band>
  );
}
