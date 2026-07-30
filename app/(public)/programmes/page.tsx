import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { cloudinaryImage } from '@/lib/cloudinary-url';
import { Band } from '@/components/band';
import { Reveal } from '@/components/reveal';
import { CardGrid } from '@/components/card-grid';
import { ContentCard } from '@/components/content-card';
import { PROGRAMME_LEVEL_LABELS, type Programme } from '@/lib/programmes';

const TITLE = 'Programmes';
const DESCRIPTION =
  'Secondary, +2, and Bachelor programmes at Modern College & School, Bhaktapur.';

// Open Graph per PRD 10.6 — a shared link renders as an official card. The index
// has no single image of its own, so it falls back to the institution logo.
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

type PublicProgramme = Pick<
  Programme,
  'id' | 'slug' | 'title' | 'level' | 'intro' | 'cover_image'
>;

export default async function ProgrammesPage() {
  const supabase = await createClient();
  const cloud = process.env.CLOUDINARY_CLOUD_NAME ?? '';

  // One read (PRD 13). RLS returns only published programmes to the public; the
  // editor-controlled display_order decides the sequence.
  const { data } = await supabase
    .from('programmes')
    .select('id, slug, title, level, intro, cover_image')
    .eq('is_published', true)
    .order('display_order', { ascending: true });

  const programmes = (data ?? []) as PublicProgramme[];

  return (
    <Band tone="paper">
      <Reveal>
        <p className="text-eyebrow uppercase tracking-wide text-green-brand">
          What we teach
        </p>
        <h1 className="mt-2 max-w-2xl font-display text-h1 text-green-ink">
          {TITLE}
        </h1>
        <p className="mt-4 max-w-2xl text-lead text-ink-muted">
          From secondary school through +2 and a Bachelor&rsquo;s degree — each
          programme with its own subjects, activities, and teaching staff.
        </p>
      </Reveal>

      {programmes.length === 0 ? (
        <Reveal className="mt-12 rounded-md border border-line bg-surface p-10 text-center">
          <p className="font-display text-h3 text-green-ink">
            Programme details are on their way
          </p>
          <p className="mx-auto mt-3 max-w-md text-ink-muted">
            We are preparing the full programme pages. In the meantime, the
            admissions page explains how to apply and whom to speak to.
          </p>
          <Link
            href="/admissions"
            className="mt-6 inline-block rounded-sm border border-green-brand px-5 py-2.5 text-sm font-medium text-green-brand transition-colors hover:bg-green-mist"
          >
            How to apply
          </Link>
        </Reveal>
      ) : (
        // A single Reveal fades the whole grid in; ContentCards must be direct
        // grid children for subgrid, so per-card stagger is not used.
        <Reveal className="mt-12">
          <CardGrid variant="media">
            {programmes.map((programme) => (
              <ContentCard
                key={programme.id}
                href={`/programmes/${programme.slug}`}
                // A null cover falls back to the shared filler, exactly as on
                // /news and /gallery — ContentCard handles that itself.
                media={{
                  cloudName: cloud,
                  publicId: programme.cover_image,
                  alt: programme.title,
                }}
                meta={
                  <span className="badge badge-neutral">
                    {PROGRAMME_LEVEL_LABELS[programme.level]}
                  </span>
                }
                title={programme.title}
                // The intro is plain text by contract (the admin field says so),
                // so it renders directly — no Markdown pass on a card.
                body={
                  programme.intro ? (
                    <p className="text-ink-muted">{programme.intro}</p>
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
