import Link from 'next/link';
import { DownloadForm } from '@/components/admin/downloads/download-form';
import { createDownload } from '../actions';

export default function NewDownloadPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href="/admin/downloads"
        className="text-sm text-ink-muted hover:text-ink"
      >
        ← Back to Downloads
      </Link>
      <h1 className="mt-3 font-display text-h2 text-green-ink">New download</h1>

      <div className="mt-8">
        {/* No cloudName prop: the uploader needs only a PURPOSE, and the file is
            delivered from a URL the public page builds server-side. */}
        <DownloadForm action={createDownload} />
      </div>
    </main>
  );
}
