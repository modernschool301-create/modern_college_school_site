import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { cloudinaryImage } from '@/lib/cloudinary-url';
import { Band } from '@/components/band';
import {
  PhotoLightbox,
  type LightboxPhoto,
} from '@/components/gallery/photo-lightbox';
import { NPT_DATE } from '@/lib/dates';

type DetailAlbum = {
  id: string;
  title: string;
  cover_photo: string | null;
  event_date: string | null;
};

// The `.eq('is_published', true)` is belt-and-braces on top of RLS, which
// already hides drafts from anon: an unpublished album returns no row here, so
// a guessed slug 404s rather than rendering an empty page. It matters that this
// is not merely "no photos to show" — the album's existence is not disclosed.
async function fetchAlbum(slug: string): Promise<DetailAlbum | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('gallery_albums')
    .select('id, title, cover_photo, event_date')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();
  return (data as DetailAlbum) ?? null;
}

// event_date is a DATE (no time); formatted from its parts so a UTC-midnight
// reading cannot shift it a day backwards in Nepal time.
function formatEventDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return date;
  return NPT_DATE.format(new Date(Date.UTC(y, m - 1, d, 12)));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const album = await fetchAlbum(slug);
  if (!album) return {};

  const description = `Photographs from ${album.title} at Modern College & School, Bhaktapur.`;
  const cloud = process.env.CLOUDINARY_CLOUD_NAME ?? '';
  // The album's own cover is the OG image where there is one; otherwise the
  // institution logo, as on every other list page.
  const ogImage = album.cover_photo
    ? cloudinaryImage(cloud, album.cover_photo, 'c_fill,w_1200,h_630')
    : cloudinaryImage(cloud, 'modern/logo1', 'c_pad,b_white,w_1200,h_630');

  return {
    title: album.title,
    description,
    openGraph: {
      title: album.title,
      description,
      type: 'article',
      images: ogImage,
    },
  };
}

export default async function GalleryAlbumPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const album = await fetchAlbum(slug);
  if (!album) notFound();

  const supabase = await createClient();
  const cloud = process.env.CLOUDINARY_CLOUD_NAME ?? '';

  // Photos carry no published flag of their own — the RLS policy ties them to
  // the parent album, so this read is safe on its own terms even though the
  // album was already checked above.
  const { data } = await supabase
    .from('gallery_photos')
    .select('id, photo_file, caption')
    .eq('album_id', album.id)
    .order('display_order', { ascending: true });

  const photos = (data ?? []) as LightboxPhoto[];

  return (
    <Band tone="paper">
      <Link
        href="/gallery"
        className="text-sm text-green-brand hover:underline"
      >
        ← All albums
      </Link>

      <p className="mt-6 text-eyebrow uppercase tracking-wide text-green-brand">
        Album
      </p>
      <h1 className="mt-2 max-w-3xl font-display text-h1 text-green-ink">
        {album.title}
      </h1>
      <p className="mt-4 flex flex-wrap items-center gap-3 text-ink-muted">
        {album.event_date && <span>{formatEventDate(album.event_date)}</span>}
        <span>
          {photos.length} photograph{photos.length === 1 ? '' : 's'}
        </span>
      </p>

      {photos.length === 0 ? (
        // A published album with no photographs yet is a real state, not an
        // error — it stays reachable and says so plainly.
        <div className="mt-12 rounded-md border border-line bg-surface p-10 text-center">
          <p className="font-display text-h3 text-green-ink">
            Photographs coming soon
          </p>
          <p className="mx-auto mt-3 max-w-md text-ink-muted">
            This album has been published but its photographs are still being
            added.
          </p>
        </div>
      ) : (
        <div className="mt-12">
          <PhotoLightbox photos={photos} cloudName={cloud} />
        </div>
      )}
    </Band>
  );
}
