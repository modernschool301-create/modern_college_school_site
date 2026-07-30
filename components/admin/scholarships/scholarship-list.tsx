'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { toCsv, downloadCsv } from '@/lib/csv';
import { ConfirmSubmitButton } from '@/components/admin/confirm-submit-button';
import {
  togglePublish,
  deleteScholarship,
  moveScholarship,
} from '@/app/admin/scholarships/actions';

export type AdminScholarshipRow = {
  id: string;
  title: string;
  description: string | null;
  criteria: string | null;
  display_order: number;
  is_published: boolean;
  created_at: string;
};

const selectClass = 'px-2 py-1.5 text-sm';
const actionClass =
  'rounded-sm border border-line px-3 py-1 text-sm font-medium transition-colors hover:bg-green-mist';

// A short preview of the description for the dense admin list — the full text
// lives on the edit form and the public page. The stored value is markdown, so
// this is raw source, deliberately: the list is an index, not a preview render.
function preview(description: string | null): string {
  const trimmed = (description ?? '').trim();
  if (!trimmed) return 'No description';
  return trimmed.length > 90 ? `${trimmed.slice(0, 90)}…` : trimmed;
}

export function ScholarshipList({
  scholarships,
}: {
  scholarships: AdminScholarshipRow[];
}) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>(
    'all',
  );

  const filtered = useMemo(() => {
    return scholarships.filter((s) => {
      if (statusFilter === 'published' && !s.is_published) return false;
      if (statusFilter === 'draft' && s.is_published) return false;
      return true;
    });
  }, [scholarships, statusFilter]);

  // Reorder acts on the TRUE neighbour in the full display_order sequence, so
  // the arrows are disabled from the unfiltered position — never the filtered
  // one, which would let a filtered view offer a move that does nothing.
  const lastIndex = scholarships.length - 1;
  const positions = useMemo(
    () => new Map(scholarships.map((s, i) => [s.id, i])),
    [scholarships],
  );

  function exportCsv() {
    const csv = toCsv(
      ['Title', 'Description', 'Criteria', 'Status', 'Order'],
      filtered.map((s) => [
        s.title,
        s.description ?? '',
        s.criteria ?? '',
        s.is_published ? 'Published' : 'Draft',
        s.display_order,
      ]),
    );
    downloadCsv('scholarships.csv', csv);
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
          {filtered.length} scholarship{filtered.length === 1 ? '' : 's'}
        </span>

        <button type="button" onClick={exportCsv} className={`ml-auto ${actionClass}`}>
          Export CSV
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-6 text-sm text-ink-muted">
          {scholarships.length === 0
            ? 'No scholarships yet. Add the first one to show it on the public page.'
            : 'No scholarships match this filter.'}
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line rounded-md border border-line">
          {filtered.map((s) => {
            const position = positions.get(s.id) ?? 0;
            return (
              <li
                key={s.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 p-4"
              >
                {/* No thumbnail column: this module has no image field (PRD 8.2). */}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{s.title}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                    <span>Order {s.display_order}</span>
                    {s.criteria && <span>Has criteria</span>}
                  </p>
                  <p className="mt-1 truncate text-xs text-ink-muted">
                    {preview(s.description)}
                  </p>
                </div>

                <span
                  className={[
                    'badge',
                    s.is_published ? 'badge-neutral' : 'badge-warning',
                  ].join(' ')}
                >
                  {s.is_published ? 'Published' : 'Draft'}
                </span>

                {/* Reorder */}
                <div className="flex items-center gap-1">
                  <form action={moveScholarship}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="direction" value="up" />
                    <button
                      type="submit"
                      disabled={position === 0}
                      aria-label={`Move ${s.title} up`}
                      className={`${actionClass} disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent`}
                    >
                      ↑
                    </button>
                  </form>
                  <form action={moveScholarship}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="direction" value="down" />
                    <button
                      type="submit"
                      disabled={position === lastIndex}
                      aria-label={`Move ${s.title} down`}
                      className={`${actionClass} disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent`}
                    >
                      ↓
                    </button>
                  </form>
                </div>

                <Link href={`/admin/scholarships/${s.id}/edit`} className={actionClass}>
                  Edit
                </Link>

                <form action={togglePublish}>
                  <input type="hidden" name="id" value={s.id} />
                  <input
                    type="hidden"
                    name="publish"
                    value={s.is_published ? 'false' : 'true'}
                  />
                  <button type="submit" className={actionClass}>
                    {s.is_published ? 'Unpublish' : 'Publish'}
                  </button>
                </form>

                <form action={deleteScholarship}>
                  <input type="hidden" name="id" value={s.id} />
                  <ConfirmSubmitButton
                    confirmText={`Delete the scholarship "${s.title}"? This cannot be undone.`}
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
