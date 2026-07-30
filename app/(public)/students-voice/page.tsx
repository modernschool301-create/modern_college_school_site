import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { cloudinaryImage } from '@/lib/cloudinary-url';
import { Band } from '@/components/band';
import { Reveal } from '@/components/reveal';
import { CardGrid } from '@/components/card-grid';
import { ContentCard } from '@/components/content-card';
import type { Testimonial } from '@/lib/testimonials';

const TITLE = "Student's Voice";
const DESCRIPTION =
  'In their own words — what students of Modern College & School, Bhaktapur, say about learning here.';

// Open Graph per PRD 10.6 — a shared link renders as an official card. The list
// page has no single image of its own, so it falls back to the institution logo.
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

type PublicTestimonial = Pick<
  Testimonial,
  'id' | 'student_name' | 'programme' | 'quote' | 'photo'
>;

export default async function StudentsVoicePage() {
  const supabase = await createClient();
  const cloud = process.env.CLOUDINARY_CLOUD_NAME ?? '';

  // One read (PRD 18). RLS returns only published rows to the public; the
  // editor-controlled display_order decides the sequence.
  const { data } = await supabase
    .from('testimonials')
    .select('id, student_name, programme, quote, photo')
    .eq('is_published', true)
    .order('display_order', { ascending: true });

  const testimonials = (data ?? []) as PublicTestimonial[];

  return (
    <Band tone="paper">
      <Reveal>
        <p className="text-eyebrow uppercase tracking-wide text-green-brand">
          In their own words
        </p>
        <h1 className="mt-2 max-w-2xl font-display text-h1 text-green-ink">
          {TITLE}
        </h1>
        <p className="mt-4 max-w-2xl text-lead text-ink-muted">
          What our students say about learning, growing, and belonging here.
        </p>
      </Reveal>

      {testimonials.length === 0 ? (
        <Reveal className="mt-12 rounded-md border border-line bg-surface p-10 text-center">
          <p className="font-display text-h3 text-green-ink">
            Our students&rsquo; stories are on their way
          </p>
          <p className="mx-auto mt-3 max-w-md text-ink-muted">
            We are gathering voices from across the campus. In the meantime, our
            news page carries the latest from student life.
          </p>
          <Link
            href="/news"
            className="mt-6 inline-block rounded-sm border border-green-brand px-5 py-2.5 text-sm font-medium text-green-brand transition-colors hover:bg-green-mist"
          >
            Read the latest news
          </Link>
        </Reveal>
      ) : (
        // A single Reveal fades the whole grid in. Per-card stagger is not used
        // here: each ContentCard must be a DIRECT grid child for subgrid to
        // align the rows, so cards can't be individually wrapped.
        <Reveal className="mt-12">
          <CardGrid variant="text">
            {testimonials.map((t) => {
              const avatar = t.photo
                ? cloudinaryImage(cloud, t.photo, 'c_fill,g_face,ar_1:1,w_200')
                : '';
              return (
                <ContentCard
                  key={t.id}
                  // The quote is the hero of the card — plain text, verbatim,
                  // never markdown.
                  body={
                    <blockquote className="font-display text-h3 leading-snug text-green-ink">
                      &ldquo;{t.quote}&rdquo;
                    </blockquote>
                  }
                  // Attribution: a small circular avatar (§4 --radius-full), name,
                  // and programme. Anchored to the base of the card by subgrid, so
                  // it sits level with a taller neighbour's regardless of quote
                  // length.
                  footer={
                    <div className="flex items-center gap-3">
                      {avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={avatar}
                          alt={`Photo of ${t.student_name}`}
                          loading="lazy"
                          className="h-12 w-12 shrink-0 rounded-full border border-line object-cover"
                        />
                      ) : (
                        <div
                          aria-hidden="true"
                          className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-green-mist font-display text-lead text-green-brand"
                        >
                          {t.student_name.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-ink">{t.student_name}</p>
                        {t.programme && (
                          <p className="text-small text-ink-muted">
                            {t.programme}
                          </p>
                        )}
                      </div>
                    </div>
                  }
                />
              );
            })}
          </CardGrid>
        </Reveal>
      )}
    </Band>
  );
}
