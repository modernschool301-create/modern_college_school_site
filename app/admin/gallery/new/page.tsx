import Link from 'next/link';
import { AlbumForm } from '@/components/admin/gallery/album-form';
import { createAlbum } from '../actions';

export default function NewAlbumPage() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? '';

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link href="/admin/gallery" className="text-sm text-ink-muted hover:text-ink">
        ← Back to Gallery
      </Link>
      <h1 className="mt-3 font-display text-h2 text-green-ink">New album</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Save the album first, then add its photographs on the next screen.
      </p>

      <div className="mt-8">
        <AlbumForm
          action={createAlbum}
          cloudName={cloudName}
          submitLabel="Save and add photographs"
        />
      </div>
    </main>
  );
}
