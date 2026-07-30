import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { cloudinaryImage } from '@/lib/cloudinary-url';
import { Band } from '@/components/band';
import { Reveal } from '@/components/reveal';
import { CardGrid } from '@/components/card-grid';
import { ContentCard } from '@/components/content-card';
import { NPT_DATE } from '@/lib/dates';

const TITLE = 'Gallery';
const DESCRIPTION =
  'Photographs from events, classes, and campus life at Modern College & School, Bhaktapur.';

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

type PublicAlbum = {
  id: string;
  slug: string;
  title: string;
  cover_photo: string | null;
  event_date: string | null;
  gallery_photos: { count: number }[];
};

// event_date is a DATE (no time), so it is formatted from its parts — passing the
// bare string to `new Date()` reads it as UTC midnight, which can render as the
// previous day once shifted into Nepal time.
function formatEventDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return date;
  return NPT_DATE.format(new Date(Date.UTC(y, m - 1, d, 12)));
}

export default async function GalleryPage() {
  const supabase = await createClient();
  const cloud = process.env.CLOUDINARY_CLOUD_NAME ?? '';

  // One read (PRD 20). RLS returns only published albums to the public; the
  // photo count comes back as an embedded aggregate in the same round trip.
  // Photos of a draft album are invisible to anon by policy, so a count here can
  // never leak from an unpublished album.
  const { data } = await supabase
    .from('gallery_albums')
    .select('id, slug, title, cover_photo, event_date, gallery_photos(count)')
    .eq('is_published', true)
    .order('display_order', { ascending: true });

  const albums = (data ?? []) as PublicAlbum[];

  return (
    <Band tone="paper">
      <Reveal>
        <p className="text-eyebrow uppercase tracking-wide text-green-brand">
          Campus life
        </p>
        <h1 className="mt-2 max-w-2xl font-display text-h1 text-green-ink">
          {TITLE}
        </h1>
        <p className="mt-4 max-w-2xl text-lead text-ink-muted">
          Events, classes, and the everyday life of the campus, album by album.
        </p>
      </Reveal>

      {albums.length === 0 ? (
        <Reveal className="mt-12 rounded-md border border-line bg-surface p-10 text-center">
          <p className="font-display text-h3 text-green-ink">
            The first albums are on their way
          </p>
          <p className="mx-auto mt-3 max-w-md text-ink-muted">
            We are gathering photographs from around the campus. In the meantime,
            our news page carries the latest from college life.
          </p>
          <Link
            href="/news"
            className="mt-6 inline-block rounded-sm border border-green-brand px-5 py-2.5 text-sm font-medium text-green-brand transition-colors hover:bg-green-mist"
          >
            Read the latest news
          </Link>
        </Reveal>
      ) : (
        // A single Reveal fades the whole grid in; ContentCards must be direct
        // grid children for subgrid, so per-card stagger is not used (see Part 1).
        <Reveal className="mt-12">
          <CardGrid variant="media">
            {albums.map((album) => {
              const count = album.gallery_photos?.[0]?.count ?? 0;
              return (
                <ContentCard
                  key={album.id}
                  href={`/gallery/${album.slug}`}
                  // A null cover falls back to the shared filler, exactly as on
                  // /news and /achievements — ContentCard handles that itself.
                  media={{
                    cloudName: cloud,
                    publicId: album.cover_photo,
                    alt: album.title,
                  }}
                  meta={
                    <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                      <span className="badge badge-neutral">
                        {count} photo{count === 1 ? '' : 's'}
                      </span>
                      {album.event_date && (
                        <span>{formatEventDate(album.event_date)}</span>
                      )}
                    </div>
                  }
                  title={album.title}
                />
              );
            })}
          </CardGrid>
        </Reveal>
      )}
    </Band>
  );
}
