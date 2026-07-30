import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createClient } from '@/lib/supabase/server';
import { cloudinaryImage } from '@/lib/cloudinary-url';
import { Band } from '@/components/band';
import { Reveal } from '@/components/reveal';
import {
  PROGRAMME_LEVEL_LABELS,
  facultyInitial,
  type Programme,
  type ProgrammeFaculty,
} from '@/lib/programmes';

type DetailProgramme = Pick<
  Programme,
  'id' | 'title' | 'level' | 'intro' | 'body' | 'cover_image'
>;

type RosterMember = Pick<ProgrammeFaculty, 'id' | 'name' | 'qualification' | 'photo'>;

// The `.eq('is_published', true)` is belt-and-braces on top of RLS, which
// already hides drafts from anon: an unpublished programme returns no row here,
// so a guessed slug 404s rather than rendering an empty page. It matters that
// this is not merely "nothing to show" — the programme's existence is not
// disclosed.
async function fetchProgramme(slug: string): Promise<DetailProgramme | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('programmes')
    .select('id, title, level, intro, body, cover_image')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();
  return (data as DetailProgramme) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const programme = await fetchProgramme(slug);
  if (!programme) return {};

  const description =
    programme.intro ??
    `The ${programme.title} programme at Modern College & School, Bhaktapur.`;
  const cloud = process.env.CLOUDINARY_CLOUD_NAME ?? '';
  // The programme's own cover is the OG image where there is one; otherwise the
  // institution logo, as on every other page.
  const ogImage = programme.cover_image
    ? cloudinaryImage(cloud, programme.cover_image, 'c_fill,w_1200,h_630')
    : cloudinaryImage(cloud, 'modern/logo1', 'c_pad,b_white,w_1200,h_630');

  return {
    title: programme.title,
    description,
    openGraph: {
      title: programme.title,
      description,
      type: 'article',
      images: ogImage,
    },
  };
}

export default async function ProgrammeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const programme = await fetchProgramme(slug);
  if (!programme) notFound();

  const supabase = await createClient();
  const cloud = process.env.CLOUDINARY_CLOUD_NAME ?? '';

  // Faculty carry no published flag of their own — the RLS policy ties them to
  // the parent programme, so this read is safe on its own terms even though the
  // programme was already checked above.
  const { data } = await supabase
    .from('programme_faculty')
    .select('id, name, qualification, photo')
    .eq('programme_id', programme.id)
    .order('display_order', { ascending: true });

  const faculty = (data ?? []) as RosterMember[];

  const cover = programme.cover_image
    ? cloudinaryImage(cloud, programme.cover_image, 'c_fill,ar_16:9,w_1600')
    : '';

  return (
    <Band tone="paper">
      <Link href="/programmes" className="text-sm text-green-brand hover:underline">
        ← All programmes
      </Link>

      <Reveal>
        <p className="mt-6 text-eyebrow uppercase tracking-wide text-green-brand">
          Programme
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="max-w-3xl font-display text-h1 text-green-ink">
            {programme.title}
          </h1>
          <span className="badge badge-neutral">
            {PROGRAMME_LEVEL_LABELS[programme.level]}
          </span>
        </div>

        {programme.intro && (
          <p className="mt-4 max-w-3xl text-lead text-ink-muted">
            {programme.intro}
          </p>
        )}
      </Reveal>

      {cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cover}
          alt=""
          className="mt-8 aspect-video w-full rounded-lg object-cover"
        />
      )}

      {programme.body && (
        // remark-gfm is what turns the curriculum/subject TABLES in the body
        // into real <table> markup; .rich-text styles them and puts a wide one
        // in its own horizontal scroller so a phone never has to scroll the
        // whole page sideways.
        <Reveal className="rich-text mt-12 max-w-3xl">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {programme.body}
          </ReactMarkdown>
        </Reveal>
      )}

      {/* Faculty roster (Decision 9). A plain roster, NOT ContentCard: these are
          people, not linked content cards, and each one is a portrait with two
          lines of text — the card's five-slot subgrid would only get in the
          way. A programme with no faculty rows omits the section entirely
          rather than showing an empty heading. */}
      {faculty.length > 0 && (
        <Reveal className="mt-16">
          <h2 className="font-display text-h2 text-green-ink">Faculty</h2>
          <p className="mt-3 max-w-2xl text-ink-muted">
            The teaching staff for this programme.
          </p>

          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {faculty.map((member) => (
              <li
                key={member.id}
                className="flex items-center gap-4 rounded-md border border-line bg-surface p-4"
              >
                {member.photo ? (
                  // Face-aware square crop, then rounded to a circle in CSS —
                  // g_face keeps the head centred whatever the original framing.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cloudinaryImage(
                      cloud,
                      member.photo,
                      'c_fill,g_face,ar_1:1,w_200',
                    )}
                    alt=""
                    loading="lazy"
                    className="h-16 w-16 shrink-0 rounded-full border border-green-pale object-cover"
                  />
                ) : (
                  // No portrait: an initial-letter stand-in, so the roster keeps
                  // its rhythm instead of showing a broken or empty circle.
                  <div
                    aria-hidden="true"
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-green-pale bg-green-mist font-display text-h3 text-green-brand"
                  >
                    {facultyInitial(member.name)}
                  </div>
                )}

                <div className="min-w-0">
                  <p className="font-medium text-green-ink">{member.name}</p>
                  {member.qualification && (
                    <p className="mt-0.5 text-small text-ink-muted">
                      {member.qualification}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Reveal>
      )}

      {/* Apply call to action.
          TODO (Phase 3): PRD 14 wants this CONTEXTUAL — shown only where
          admissions for THIS programme are open, and linking to that
          programme's own form. That needs `admission_forms` (PRD 8.3), which
          does not exist yet, and a link between a programme and its form id.
          Until then this is a generic link to /admissions, which is correct on
          its own terms: the admissions page carries the current procedure and
          deadlines. Wire the contextual version when the Admissions module
          lands — do not add a placeholder table for it before then. */}
      <Reveal className="mt-16 rounded-lg border border-line bg-green-mist p-8 text-center sm:p-10">
        <p className="font-display text-h3 text-green-ink">
          Interested in this programme?
        </p>
        <p className="mx-auto mt-3 max-w-lg text-ink-muted">
          The admissions page sets out the procedure, what to bring, and how to
          reach the admissions office.
        </p>
        <Link href="/admissions" className="btn-primary mt-6 text-sm">
          Apply now
        </Link>
      </Reveal>
    </Band>
  );
}
