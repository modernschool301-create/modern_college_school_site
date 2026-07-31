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
  facultyInitial,
  type Programme,
  type ProgrammeSpecialization,
  type SpecializationFaculty,
} from '@/lib/programmes';

// A specialization's own page, nested under its parent programme. Structurally
// this mirrors the programme detail page (PRD 14) one level down: eyebrow,
// title, lead, cover, markdown body, faculty roster, Apply band.

type ParentProgramme = Pick<
  Programme,
  'id' | 'slug' | 'title' | 'cover_image'
>;

type DetailSpecialization = Pick<
  ProgrammeSpecialization,
  'id' | 'title' | 'slug' | 'description' | 'body' | 'image'
>;

type RosterMember = Pick<
  SpecializationFaculty,
  'id' | 'name' | 'qualification' | 'photo'
>;

// Resolving BOTH rows is the whole access check, and it is done in two steps on
// purpose:
//
//   1. The parent programme is looked up by the slug in the URL and must be
//      PUBLISHED. `.eq('is_published', true)` is belt-and-braces on top of RLS
//      (which already hides drafts from anon) — an unpublished programme yields
//      no row, so its specializations 404 rather than leaking.
//   2. The specialization is then looked up by (that programme's id, its own
//      slug). Because the parent is part of the lookup, a URL that names the
//      WRONG parent — /programmes/bbs/business-studies — finds nothing and 404s.
//      It never resolves a Management specialization under BBS.
//
// A single joined query would work too, but this ordering makes the failure
// modes explicit and gives the page the parent's title for the breadcrumb.
async function fetchSpecialization(
  programmeSlug: string,
  specializationSlug: string,
): Promise<{
  programme: ParentProgramme;
  specialization: DetailSpecialization;
} | null> {
  const supabase = await createClient();

  const { data: programmeData } = await supabase
    .from('programmes')
    .select('id, slug, title, cover_image')
    .eq('slug', programmeSlug)
    .eq('is_published', true)
    .single();
  if (!programmeData) return null;

  const programme = programmeData as ParentProgramme;

  const { data: specializationData } = await supabase
    .from('programme_specializations')
    .select('id, title, slug, description, body, image')
    .eq('programme_id', programme.id)
    .eq('slug', specializationSlug)
    .single();
  if (!specializationData) return null;

  return {
    programme,
    specialization: specializationData as DetailSpecialization,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; specialization: string }>;
}): Promise<Metadata> {
  const { slug, specialization: specializationSlug } = await params;
  const found = await fetchSpecialization(slug, specializationSlug);
  if (!found) return {};

  const { programme, specialization } = found;

  const description =
    specialization.description ??
    `${specialization.title}, part of the ${programme.title} programme at Modern College & School, Bhaktapur.`;
  const cloud = process.env.CLOUDINARY_CLOUD_NAME ?? '';

  // Its own image first; then the parent programme's cover, so a shared link
  // still looks like the programme it belongs to; then the institution logo, as
  // on every other page.
  const photograph = specialization.image ?? programme.cover_image;
  const ogImage = photograph
    ? cloudinaryImage(cloud, photograph, 'c_fill,w_1200,h_630')
    : // The logo is padded on white rather than cropped to fill — c_fill would
      // slice a mark that has no safe crop.
      cloudinaryImage(cloud, 'modern/logo1', 'c_pad,b_white,w_1200,h_630');

  return {
    title: `${specialization.title} — ${programme.title}`,
    description,
    openGraph: {
      title: specialization.title,
      description,
      type: 'article',
      images: ogImage,
    },
  };
}

export default async function SpecializationDetailPage({
  params,
}: {
  params: Promise<{ slug: string; specialization: string }>;
}) {
  const { slug, specialization: specializationSlug } = await params;
  const found = await fetchSpecialization(slug, specializationSlug);
  if (!found) notFound();

  const { programme, specialization } = found;

  const supabase = await createClient();
  const cloud = process.env.CLOUDINARY_CLOUD_NAME ?? '';

  // This roster is the project's first GRANDCHILD read. It carries no published
  // flag of its own and the RLS policy walks BOTH levels
  // (specialization_faculty → programme_specializations → programmes) to test
  // the programme's is_published — so this read is safe on its own terms even
  // though the parent was already checked above.
  const { data } = await supabase
    .from('specialization_faculty')
    .select('id, name, qualification, photo')
    .eq('specialization_id', specialization.id)
    .order('display_order', { ascending: true });

  const faculty = (data ?? []) as RosterMember[];

  const cover = specialization.image
    ? cloudinaryImage(cloud, specialization.image, 'c_fill,ar_16:9,w_1600')
    : '';

  return (
    <Band tone="paper">
      {/* Back to the PARENT, by name — one level up, not to the index. A visitor
          who arrived here from a search result needs to know what this is part
          of before they need the full list. */}
      <Link
        href={`/programmes/${programme.slug}`}
        className="text-sm text-green-brand hover:underline"
      >
        ← {programme.title}
      </Link>

      {/* Same centred reading column as the programme detail page: `measure`
          (68ch) with mx-auto. Two elements rather than one wrapper because the
          cover image sits between them and stays full-width. Only the CONTAINER
          is centred — the text inside keeps its normal left alignment. */}
      <Reveal className="measure mx-auto">
        <p className="mt-6 text-eyebrow uppercase tracking-wide text-green-brand">
          {programme.title}
        </p>
        <h1 className="mt-2 font-display text-h1 text-green-ink">
          {specialization.title}
        </h1>

        {specialization.description && (
          <p className="mt-4 text-lead text-ink-muted">
            {specialization.description}
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

      {specialization.body && (
        // remark-gfm turns subject TABLES in the body into real <table> markup;
        // .rich-text styles them and puts a wide one in its own horizontal
        // scroller so a phone never has to scroll the whole page sideways.
        <Reveal className="rich-text measure mx-auto mt-12">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {specialization.body}
          </ReactMarkdown>
        </Reveal>
      )}

      {/* Faculty roster — identical in markup to the programme detail page's,
          against this specialization's own rows. A specialization with no
          faculty omits the section entirely rather than showing an empty
          heading. */}
      {faculty.length > 0 && (
        <Reveal className="mt-16">
          <h2 className="font-display text-h2 text-green-ink">Faculty</h2>
          <p className="mt-3 max-w-2xl text-ink-muted">
            The teaching staff for this specialization.
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
          TODO (Phase 3): the same TODO the programme detail page carries — PRD
          14 wants this CONTEXTUAL, shown only where admissions are open and
          linking to the right form. That needs `admission_forms` (PRD 8.3),
          which does not exist yet. Until then this is a generic link to
          /admissions, correct on its own terms: that page carries the current
          procedure and deadlines. Wire the contextual version when the
          Admissions module lands — and note that a specialization is still NOT
          a management_stream, so this must not become a stream picker here. */}
      <Reveal className="mt-16 rounded-lg border border-line bg-green-mist p-8 text-center sm:p-10">
        <p className="font-display text-h3 text-green-ink">
          Interested in {specialization.title}?
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
