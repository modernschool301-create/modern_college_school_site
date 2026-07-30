'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { cloudinaryImage } from '@/lib/cloudinary-url';
import { toCsv, downloadCsv } from '@/lib/csv';
import { ConfirmSubmitButton } from '@/components/admin/confirm-submit-button';
import {
  PROGRAMME_LEVEL_LABELS,
  type ProgrammeLevel,
} from '@/lib/programmes';
import {
  toggleProgrammePublish,
  deleteProgramme,
  moveProgramme,
} from '@/app/admin/programmes/actions';

export type AdminProgrammeRow = {
  id: string;
  slug: string;
  title: string;
  level: ProgrammeLevel;
  cover_image: string | null;
  display_order: number;
  is_published: boolean;
  faculty_count: number;
};

const selectClass = 'px-2 py-1.5 text-sm';
const actionClass =
  'rounded-sm border border-line px-3 py-1 text-sm font-medium transition-colors hover:bg-green-mist';

export function ProgrammeList({
  programmes,
  cloudName,
}: {
  programmes: AdminProgrammeRow[];
  cloudName: string;
}) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>(
    'all',
  );

  const filtered = useMemo(() => {
    return programmes.filter((p) => {
      if (statusFilter === 'published' && !p.is_published) return false;
      if (statusFilter === 'draft' && p.is_published) return false;
      return true;
    });
  }, [programmes, statusFilter]);

  // Reorder acts on the TRUE neighbour in the full display_order sequence, so
  // the arrows are disabled from the unfiltered position — never the filtered
  // one, which would let a filtered view offer a move that does nothing.
  const lastIndex = programmes.length - 1;
  const positions = useMemo(
    () => new Map(programmes.map((p, i) => [p.id, i])),
    [programmes],
  );

  function exportCsv() {
    const csv = toCsv(
      ['Title', 'Slug', 'Level', 'Faculty', 'Status', 'Order'],
      filtered.map((p) => [
        p.title,
        p.slug,
        PROGRAMME_LEVEL_LABELS[p.level],
        p.faculty_count,
        p.is_published ? 'Published' : 'Draft',
        p.display_order,
      ]),
    );
    downloadCsv('programmes.csv', csv);
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
          {filtered.length} programme{filtered.length === 1 ? '' : 's'}
        </span>

        <button type="button" onClick={exportCsv} className={`ml-auto ${actionClass}`}>
          Export CSV
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-6 text-sm text-ink-muted">
          {programmes.length === 0
            ? 'No programmes yet. Create the first one to show it on the public page.'
            : 'No programmes match this filter.'}
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line rounded-md border border-line">
          {filtered.map((p) => {
            const position = positions.get(p.id) ?? 0;
            const thumb = p.cover_image
              ? cloudinaryImage(cloudName, p.cover_image, 'c_fill,ar_1:1,w_120')
              : '';
            return (
              <li
                key={p.id}
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
                  <p className="truncate font-medium text-ink">{p.title}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                    <span>
                      {p.faculty_count} faculty member
                      {p.faculty_count === 1 ? '' : 's'}
                    </span>
                    <span>Order {p.display_order}</span>
                  </p>
                </div>

                <span className="badge badge-neutral">
                  {PROGRAMME_LEVEL_LABELS[p.level]}
                </span>

                <span
                  className={[
                    'badge',
                    p.is_published ? 'badge-neutral' : 'badge-warning',
                  ].join(' ')}
                >
                  {p.is_published ? 'Published' : 'Draft'}
                </span>

                {/* Reorder */}
                <div className="flex items-center gap-1">
                  <form action={moveProgramme}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="direction" value="up" />
                    <button
                      type="submit"
                      disabled={position === 0}
                      aria-label={`Move ${p.title} up`}
                      className={`${actionClass} disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent`}
                    >
                      ↑
                    </button>
                  </form>
                  <form action={moveProgramme}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="direction" value="down" />
                    <button
                      type="submit"
                      disabled={position === lastIndex}
                      aria-label={`Move ${p.title} down`}
                      className={`${actionClass} disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent`}
                    >
                      ↓
                    </button>
                  </form>
                </div>

                <Link href={`/admin/programmes/${p.id}/edit`} className={actionClass}>
                  Edit
                </Link>

                <form action={toggleProgrammePublish}>
                  <input type="hidden" name="id" value={p.id} />
                  <input
                    type="hidden"
                    name="publish"
                    value={p.is_published ? 'false' : 'true'}
                  />
                  <button type="submit" className={actionClass}>
                    {p.is_published ? 'Unpublish' : 'Publish'}
                  </button>
                </form>

                <form action={deleteProgramme}>
                  <input type="hidden" name="id" value={p.id} />
                  {/* The cascade is spelled out: deleting a programme is not
                      just losing one row, and the count makes the cost
                      concrete. */}
                  <ConfirmSubmitButton
                    confirmText={`Delete the programme "${p.title}"? This also deletes its ${p.faculty_count} faculty member${p.faculty_count === 1 ? '' : 's'}. This cannot be undone.`}
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
