'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { cloudinaryImage } from '@/lib/cloudinary-url';
import { toCsv, downloadCsv } from '@/lib/csv';
import { NPT_DATE } from '@/lib/dates';
import { ConfirmSubmitButton } from '@/components/admin/confirm-submit-button';
import {
  toggleAlbumPublish,
  deleteAlbum,
  moveAlbum,
} from '@/app/admin/gallery/actions';

export type AdminAlbumRow = {
  id: string;
  slug: string;
  title: string;
  cover_photo: string | null;
  event_date: string | null;
  display_order: number;
  is_published: boolean;
  photo_count: number;
};

const selectClass = 'px-2 py-1.5 text-sm';
const actionClass =
  'rounded-sm border border-line px-3 py-1 text-sm font-medium transition-colors hover:bg-green-mist';

// event_date is a DATE (no time), so it is formatted from its parts rather than
// through `new Date(string)` — which would read it as UTC midnight and can slip
// a day backwards once rendered in Nepal time.
function formatEventDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return date;
  return NPT_DATE.format(new Date(Date.UTC(y, m - 1, d, 12)));
}

export function AlbumList({
  albums,
  cloudName,
}: {
  albums: AdminAlbumRow[];
  cloudName: string;
}) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>(
    'all',
  );

  const filtered = useMemo(() => {
    return albums.filter((a) => {
      if (statusFilter === 'published' && !a.is_published) return false;
      if (statusFilter === 'draft' && a.is_published) return false;
      return true;
    });
  }, [albums, statusFilter]);

  // Reorder acts on the TRUE neighbour in the full display_order sequence, so
  // the arrows are disabled from the unfiltered position — never the filtered
  // one, which would let a filtered view offer a move that does nothing.
  const lastIndex = albums.length - 1;
  const positions = useMemo(
    () => new Map(albums.map((a, i) => [a.id, i])),
    [albums],
  );

  function exportCsv() {
    const csv = toCsv(
      ['Title', 'Slug', 'Photographs', 'Event date', 'Status', 'Order'],
      filtered.map((a) => [
        a.title,
        a.slug,
        a.photo_count,
        a.event_date ?? '',
        a.is_published ? 'Published' : 'Draft',
        a.display_order,
      ]),
    );
    downloadCsv('gallery-albums.csv', csv);
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
          {filtered.length} album{filtered.length === 1 ? '' : 's'}
        </span>

        <button type="button" onClick={exportCsv} className={`ml-auto ${actionClass}`}>
          Export CSV
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-6 text-sm text-ink-muted">
          {albums.length === 0
            ? 'No albums yet. Create the first one to show it on the public page.'
            : 'No albums match this filter.'}
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line rounded-md border border-line">
          {filtered.map((a) => {
            const position = positions.get(a.id) ?? 0;
            const thumb = a.cover_photo
              ? cloudinaryImage(cloudName, a.cover_photo, 'c_fill,ar_1:1,w_120')
              : '';
            return (
              <li
                key={a.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 p-4"
              >
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumb}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-sm border border-line object-cover"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="h-12 w-12 shrink-0 rounded-sm border border-line bg-green-mist"
                  />
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{a.title}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                    <span>
                      {a.photo_count} photograph{a.photo_count === 1 ? '' : 's'}
                    </span>
                    {a.event_date && <span>{formatEventDate(a.event_date)}</span>}
                    <span>Order {a.display_order}</span>
                  </p>
                </div>

                <span
                  className={[
                    'badge',
                    a.is_published ? 'badge-neutral' : 'badge-warning',
                  ].join(' ')}
                >
                  {a.is_published ? 'Published' : 'Draft'}
                </span>

                {/* Reorder */}
                <div className="flex items-center gap-1">
                  <form action={moveAlbum}>
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="direction" value="up" />
                    <button
                      type="submit"
                      disabled={position === 0}
                      aria-label={`Move ${a.title} up`}
                      className={`${actionClass} disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent`}
                    >
                      ↑
                    </button>
                  </form>
                  <form action={moveAlbum}>
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="direction" value="down" />
                    <button
                      type="submit"
                      disabled={position === lastIndex}
                      aria-label={`Move ${a.title} down`}
                      className={`${actionClass} disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent`}
                    >
                      ↓
                    </button>
                  </form>
                </div>

                <Link href={`/admin/gallery/${a.id}/edit`} className={actionClass}>
                  Edit
                </Link>

                <form action={toggleAlbumPublish}>
                  <input type="hidden" name="id" value={a.id} />
                  <input
                    type="hidden"
                    name="publish"
                    value={a.is_published ? 'false' : 'true'}
                  />
                  <button type="submit" className={actionClass}>
                    {a.is_published ? 'Unpublish' : 'Publish'}
                  </button>
                </form>

                <form action={deleteAlbum}>
                  <input type="hidden" name="id" value={a.id} />
                  {/* The cascade is spelled out: deleting an album is not just
                      losing one row, and the count makes the cost concrete. */}
                  <ConfirmSubmitButton
                    confirmText={`Delete the album "${a.title}"? This also deletes its ${a.photo_count} photograph${a.photo_count === 1 ? '' : 's'}. This cannot be undone.`}
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
