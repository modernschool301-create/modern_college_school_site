import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AlbumForm } from '@/components/admin/gallery/album-form';
import {
  AlbumPhotos,
  type AdminPhotoRow,
} from '@/components/admin/gallery/album-photos';
import { updateAlbum } from '../../actions';
import type { GalleryAlbum } from '@/lib/gallery';

// Unlike every other edit screen so far, this one manages TWO things: the
// album's own fields, and the album's photographs. They are separate forms
// posting to separate actions — saving the album redirects back to the list,
// while photo actions stay here, so the two never fight over one submit.
export default async function EditAlbumPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from('gallery_albums')
    .select('*')
    .eq('id', id)
    .single();

  if (!data) notFound();

  const album = data as GalleryAlbum;

  const { data: photoData } = await supabase
    .from('gallery_photos')
    .select('id, photo_file, caption, display_order')
    .eq('album_id', album.id)
    .order('display_order', { ascending: true });

  const photos = (photoData ?? []) as AdminPhotoRow[];
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? '';

  // Bind the id so the form's action matches (state, formData) => state.
  const action = updateAlbum.bind(null, album.id);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link href="/admin/gallery" className="text-sm text-ink-muted hover:text-ink">
        ← Back to Gallery
      </Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-h2 text-green-ink">Edit album</h1>
        {album.is_published && (
          <Link
            href={`/gallery/${album.slug}`}
            className="text-sm text-green-brand hover:underline"
          >
            View on the site →
          </Link>
        )}
      </div>

      <div className="mt-8">
        <AlbumForm
          action={action}
          cloudName={cloudName}
          initial={{
            title: album.title,
            slug: album.slug,
            cover_photo: album.cover_photo,
            event_date: album.event_date,
            is_published: album.is_published,
          }}
        />
      </div>

      <hr className="mt-12 border-line" />

      <div className="mt-12">
        <AlbumPhotos
          albumId={album.id}
          photos={photos}
          cloudName={cloudName}
        />
      </div>
    </main>
  );
}
