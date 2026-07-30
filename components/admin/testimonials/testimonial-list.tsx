'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { cloudinaryImage } from '@/lib/cloudinary-url';
import { toCsv, downloadCsv } from '@/lib/csv';
import { ConfirmSubmitButton } from '@/components/admin/confirm-submit-button';
import {
  togglePublish,
  deleteTestimonial,
  moveTestimonial,
} from '@/app/admin/testimonials/actions';

export type AdminTestimonialRow = {
  id: string;
  student_name: string;
  programme: string | null;
  quote: string;
  photo: string | null;
  display_order: number;
  is_published: boolean;
  created_at: string;
};

const selectClass = 'px-2 py-1.5 text-sm';
const actionClass =
  'rounded-sm border border-line px-3 py-1 text-sm font-medium transition-colors hover:bg-green-mist';

// A short preview of the quote for the dense admin list — the full text lives on
// the edit form and the public page.
function preview(quote: string): string {
  const trimmed = quote.trim();
  return trimmed.length > 90 ? `${trimmed.slice(0, 90)}…` : trimmed;
}

export function TestimonialList({
  testimonials,
  cloudName,
}: {
  testimonials: AdminTestimonialRow[];
  cloudName: string;
}) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>(
    'all',
  );

  const filtered = useMemo(() => {
    return testimonials.filter((t) => {
      if (statusFilter === 'published' && !t.is_published) return false;
      if (statusFilter === 'draft' && t.is_published) return false;
      return true;
    });
  }, [testimonials, statusFilter]);

  // Reorder acts on the TRUE neighbour in the full display_order sequence, so
  // the arrows are disabled from the unfiltered position — never the filtered
  // one, which would let a filtered view offer a move that does nothing.
  const lastIndex = testimonials.length - 1;
  const positions = useMemo(
    () => new Map(testimonials.map((t, i) => [t.id, i])),
    [testimonials],
  );

  function exportCsv() {
    const csv = toCsv(
      ['Student name', 'Programme', 'Quote', 'Status', 'Order'],
      filtered.map((t) => [
        t.student_name,
        t.programme ?? '',
        t.quote,
        t.is_published ? 'Published' : 'Draft',
        t.display_order,
      ]),
    );
    downloadCsv('testimonials.csv', csv);
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
          {filtered.length} testimonial{filtered.length === 1 ? '' : 's'}
        </span>

        <button type="button" onClick={exportCsv} className={`ml-auto ${actionClass}`}>
          Export CSV
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-6 text-sm text-ink-muted">
          {testimonials.length === 0
            ? 'No testimonials yet. Add the first one to show it on the public page.'
            : 'No testimonials match this filter.'}
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line rounded-md border border-line">
          {filtered.map((t) => {
            const position = positions.get(t.id) ?? 0;
            const thumb = t.photo
              ? cloudinaryImage(cloudName, t.photo, 'c_fill,g_face,ar_1:1,w_120')
              : '';
            return (
              <li
                key={t.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 p-4"
              >
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumb}
                    alt={`Photo of ${t.student_name}`}
                    className="h-12 w-12 shrink-0 rounded-full border border-line object-cover"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="h-12 w-12 shrink-0 rounded-full border border-line bg-green-mist"
                  />
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">
                    {t.student_name}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                    <span>{t.programme || 'No programme'}</span>
                    <span>Order {t.display_order}</span>
                  </p>
                  <p className="mt-1 truncate text-xs italic text-ink-muted">
                    “{preview(t.quote)}”
                  </p>
                </div>

                <span
                  className={[
                    'badge',
                    t.is_published ? 'badge-neutral' : 'badge-warning',
                  ].join(' ')}
                >
                  {t.is_published ? 'Published' : 'Draft'}
                </span>

                {/* Reorder */}
                <div className="flex items-center gap-1">
                  <form action={moveTestimonial}>
                    <input type="hidden" name="id" value={t.id} />
                    <input type="hidden" name="direction" value="up" />
                    <button
                      type="submit"
                      disabled={position === 0}
                      aria-label={`Move ${t.student_name} up`}
                      className={`${actionClass} disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent`}
                    >
                      ↑
                    </button>
                  </form>
                  <form action={moveTestimonial}>
                    <input type="hidden" name="id" value={t.id} />
                    <input type="hidden" name="direction" value="down" />
                    <button
                      type="submit"
                      disabled={position === lastIndex}
                      aria-label={`Move ${t.student_name} down`}
                      className={`${actionClass} disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent`}
                    >
                      ↓
                    </button>
                  </form>
                </div>

                <Link href={`/admin/testimonials/${t.id}/edit`} className={actionClass}>
                  Edit
                </Link>

                <form action={togglePublish}>
                  <input type="hidden" name="id" value={t.id} />
                  <input
                    type="hidden"
                    name="publish"
                    value={t.is_published ? 'false' : 'true'}
                  />
                  <button type="submit" className={actionClass}>
                    {t.is_published ? 'Unpublish' : 'Publish'}
                  </button>
                </form>

                <form action={deleteTestimonial}>
                  <input type="hidden" name="id" value={t.id} />
                  <ConfirmSubmitButton
                    confirmText={`Delete the testimonial from "${t.student_name}"? This cannot be undone.`}
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
