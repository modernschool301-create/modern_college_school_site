'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { toCsv, downloadCsv } from '@/lib/csv';
import { ConfirmSubmitButton } from '@/components/admin/confirm-submit-button';
import {
  DOWNLOAD_CATEGORY_SINGULAR,
  type DownloadCategory,
} from '@/lib/downloads';
import {
  togglePublish,
  deleteDownload,
  moveDownload,
} from '@/app/admin/downloads/actions';

export type AdminDownloadRow = {
  id: string;
  title: string;
  description: string | null;
  file: string;
  category: DownloadCategory;
  display_order: number;
  is_published: boolean;
  created_at: string;
};

const selectClass = 'px-2 py-1.5 text-sm';
const actionClass =
  'rounded-sm border border-line px-3 py-1 text-sm font-medium transition-colors hover:bg-green-mist';

// The last path segment of a RAW public ID is the stored filename with its
// extension — the most useful identifier for the file in a dense list.
function fileName(publicId: string): string {
  return publicId.split('/').pop() || publicId;
}

export function DownloadList({ downloads }: { downloads: AdminDownloadRow[] }) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>(
    'all',
  );

  const filtered = useMemo(() => {
    return downloads.filter((d) => {
      if (statusFilter === 'published' && !d.is_published) return false;
      if (statusFilter === 'draft' && d.is_published) return false;
      return true;
    });
  }, [downloads, statusFilter]);

  // Reorder acts on the TRUE neighbour in the full display_order sequence, so
  // the arrows are disabled from the unfiltered position — never the filtered
  // one, which would let a filtered view offer a move that does nothing.
  const lastIndex = downloads.length - 1;
  const positions = useMemo(
    () => new Map(downloads.map((d, i) => [d.id, i])),
    [downloads],
  );

  function exportCsv() {
    const csv = toCsv(
      ['Title', 'Category', 'Description', 'File', 'Status', 'Order'],
      filtered.map((d) => [
        d.title,
        DOWNLOAD_CATEGORY_SINGULAR[d.category],
        d.description ?? '',
        d.file,
        d.is_published ? 'Published' : 'Draft',
        d.display_order,
      ]),
    );
    downloadCsv('downloads.csv', csv);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as 'all' | 'published' | 'draft')
          }
          className={selectClass}
        >
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>

        <span className="text-sm text-ink-muted">
          {filtered.length} download{filtered.length === 1 ? '' : 's'}
        </span>

        <button type="button" onClick={exportCsv} className={`ml-auto ${actionClass}`}>
          Export CSV
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-6 text-sm text-ink-muted">
          {downloads.length === 0
            ? 'No downloads yet. Add the first one to show it on the public page.'
            : 'No downloads match this filter.'}
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line rounded-md border border-line">
          {filtered.map((d) => {
            const position = positions.get(d.id) ?? 0;
            return (
              <li
                key={d.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{d.title}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                    <span>Order {d.display_order}</span>
                    <span className="break-all">{fileName(d.file)}</span>
                  </p>
                </div>

                <span className="badge badge-neutral">
                  {DOWNLOAD_CATEGORY_SINGULAR[d.category]}
                </span>

                <span
                  className={[
                    'badge',
                    d.is_published ? 'badge-neutral' : 'badge-warning',
                  ].join(' ')}
                >
                  {d.is_published ? 'Published' : 'Draft'}
                </span>

                {/* Reorder */}
                <div className="flex items-center gap-1">
                  <form action={moveDownload}>
                    <input type="hidden" name="id" value={d.id} />
                    <input type="hidden" name="direction" value="up" />
                    <button
                      type="submit"
                      disabled={position === 0}
                      aria-label={`Move ${d.title} up`}
                      className={`${actionClass} disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent`}
                    >
                      ↑
                    </button>
                  </form>
                  <form action={moveDownload}>
                    <input type="hidden" name="id" value={d.id} />
                    <input type="hidden" name="direction" value="down" />
                    <button
                      type="submit"
                      disabled={position === lastIndex}
                      aria-label={`Move ${d.title} down`}
                      className={`${actionClass} disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent`}
                    >
                      ↓
                    </button>
                  </form>
                </div>

                <Link href={`/admin/downloads/${d.id}/edit`} className={actionClass}>
                  Edit
                </Link>

                <form action={togglePublish}>
                  <input type="hidden" name="id" value={d.id} />
                  <input
                    type="hidden"
                    name="publish"
                    value={d.is_published ? 'false' : 'true'}
                  />
                  <button type="submit" className={actionClass}>
                    {d.is_published ? 'Unpublish' : 'Publish'}
                  </button>
                </form>

                <form action={deleteDownload}>
                  <input type="hidden" name="id" value={d.id} />
                  <ConfirmSubmitButton
                    confirmText={`Delete the download "${d.title}"? This cannot be undone.`}
                    className="rounded-sm border border-line px-3 py-1 text-sm font-medium text-danger transition-colors hover:bg-danger-bg"
                  >
                    Delete
                  </ConfirmSubmitButton>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
