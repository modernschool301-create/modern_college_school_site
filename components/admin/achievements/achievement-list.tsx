'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { NPT_DATE } from '@/lib/dates';
import { cloudinaryImage } from '@/lib/cloudinary-url';
import { toCsv, downloadCsv } from '@/lib/csv';
import { ConfirmSubmitButton } from '@/components/admin/confirm-submit-button';
import {
  togglePublish,
  deleteAchievement,
  moveAchievement,
} from '@/app/admin/achievements/actions';

export type AdminAchievementRow = {
  id: string;
  title: string;
  image: string | null;
  achieved_on: string | null;
  display_order: number;
  is_published: boolean;
  created_at: string;
};

const selectClass = 'px-2 py-1.5 text-sm';
const actionClass =
  'rounded-sm border border-line px-3 py-1 text-sm font-medium transition-colors hover:bg-green-mist';

export function AchievementList({
  achievements,
  cloudName,
}: {
  achievements: AdminAchievementRow[];
  cloudName: string;
}) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>(
    'all',
  );

  const filtered = useMemo(() => {
    return achievements.filter((a) => {
      if (statusFilter === 'published' && !a.is_published) return false;
      if (statusFilter === 'draft' && a.is_published) return false;
      return true;
    });
  }, [achievements, statusFilter]);

  // Reorder acts on the TRUE neighbour in the full display_order sequence, so
  // the arrows are disabled from the unfiltered position — never the filtered
  // one, which would let a filtered view offer a move that does nothing.
  const lastIndex = achievements.length - 1;
  const positions = useMemo(
    () => new Map(achievements.map((a, i) => [a.id, i])),
    [achievements],
  );

  function exportCsv() {
    const csv = toCsv(
      ['Title', 'Date achieved', 'Status', 'Order'],
      filtered.map((a) => [
        a.title,
        a.achieved_on ? NPT_DATE.format(new Date(a.achieved_on)) : '',
        a.is_published ? 'Published' : 'Draft',
        a.display_order,
      ]),
    );
    downloadCsv('achievements.csv', csv);
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
          {filtered.length} achievement{filtered.length === 1 ? '' : 's'}
        </span>

        <button type="button" onClick={exportCsv} className={`ml-auto ${actionClass}`}>
          Export CSV
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-6 text-sm text-ink-muted">
          {achievements.length === 0
            ? 'No achievements yet. Add the first one to show it on the public page.'
            : 'No achievements match this filter.'}
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line rounded-md border border-line">
          {filtered.map((a) => {
            const position = positions.get(a.id) ?? 0;
            const thumb = a.image
              ? cloudinaryImage(cloudName, a.image, 'c_fill,ar_4:3,w_160')
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
                    alt={`Image for ${a.title}`}
                    className="h-12 w-16 shrink-0 rounded-sm border border-line object-cover"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="h-12 w-16 shrink-0 rounded-sm border border-line bg-green-mist"
                  />
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{a.title}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                    <span>
                      {a.achieved_on
                        ? NPT_DATE.format(new Date(a.achieved_on))
                        : 'No date'}
                    </span>
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
                  <form action={moveAchievement}>
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
                  <form action={moveAchievement}>
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

                <Link href={`/admin/achievements/${a.id}/edit`} className={actionClass}>
                  Edit
                </Link>

                <form action={togglePublish}>
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

                <form action={deleteAchievement}>
                  <input type="hidden" name="id" value={a.id} />
                  <ConfirmSubmitButton
                    confirmText={`Delete "${a.title}"? This cannot be undone.`}
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
