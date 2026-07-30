import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  AlbumList,
  type AdminAlbumRow,
} from '@/components/admin/gallery/album-list';

// The embedded aggregate PostgREST returns for `gallery_photos(count)`.
type AlbumWithCount = Omit<AdminAlbumRow, 'photo_count'> & {
  gallery_photos: { count: number }[];
};

// Admin-only (the /admin layout enforces the live active-admin check). The admin
// RLS policy returns ALL albums here, drafts included.
export default async function AdminGalleryPage() {
  const supabase = await createClient();

  // The photo count comes back as an embedded aggregate rather than N follow-up
  // queries — one round trip for the whole list.
  const { data } = await supabase
    .from('gallery_albums')
    .select(
      'id, slug, title, cover_photo, event_date, display_order, is_published, gallery_photos(count)',
    )
    .order('display_order', { ascending: true });

  const albums: AdminAlbumRow[] = ((data ?? []) as AlbumWithCount[]).map(
    ({ gallery_photos, ...album }) => ({
      ...album,
      photo_count: gallery_photos?.[0]?.count ?? 0,
    }),
  );

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? '';

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-h2 text-green-ink">Gallery</h1>
        <Link href="/admin/gallery/new" className="btn-primary text-sm">
          New album
        </Link>
      </div>

      <p className="mt-2 text-sm text-ink-muted">
        The Gallery page lists published albums in this order. Open an album to
        add or reorder its photographs.
      </p>

      <div className="mt-8">
        <AlbumList albums={albums} cloudName={cloudName} />
      </div>
    </main>
  );
}
