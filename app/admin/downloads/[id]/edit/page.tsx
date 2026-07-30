import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DownloadForm } from '@/components/admin/downloads/download-form';
import { updateDownload } from '../../actions';
import type { Download } from '@/lib/downloads';

export default async function EditDownloadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from('downloads')
    .select('*')
    .eq('id', id)
    .single();

  if (!data) notFound();

  const download = data as Download;

  // Bind the id so the form's action matches (state, formData) => state.
  const action = updateDownload.bind(null, download.id);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href="/admin/downloads"
        className="text-sm text-ink-muted hover:text-ink"
      >
        ← Back to Downloads
      </Link>
      <h1 className="mt-3 font-display text-h2 text-green-ink">Edit download</h1>

      <div className="mt-8">
        <DownloadForm
          action={action}
          initial={{
            title: download.title,
            description: download.description,
            file: download.file,
            category: download.category,
            is_published: download.is_published,
          }}
        />
      </div>
    </main>
  );
}
