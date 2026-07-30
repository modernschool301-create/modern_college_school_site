'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { POST_TYPES, POST_TYPE_LABELS, type PostType } from '@/lib/news';
import { NPT_DATE } from '@/lib/dates';
import { togglePublish, deletePost } from '@/app/admin/news/actions';
import { ConfirmSubmitButton } from '@/components/admin/confirm-submit-button';
import { toCsv, downloadCsv } from '@/lib/csv';

export type AdminPostRow = {
  id: string;
  title: string;
  slug: string;
  type: PostType;
  category_name: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
};

const selectClass =
  'px-2 py-1.5 text-sm';

export function PostList({ posts }: { posts: AdminPostRow[] }) {
  const [typeFilter, setTypeFilter] = useState<'all' | PostType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>(
    'all',
  );

  const filtered = useMemo(() => {
    return posts.filter((p) => {
      if (typeFilter !== 'all' && p.type !== typeFilter) return false;
      if (statusFilter === 'published' && !p.is_published) return false;
      if (statusFilter === 'draft' && p.is_published) return false;
      return true;
    });
  }, [posts, typeFilter, statusFilter]);

  function exportCsv() {
    const csv = toCsv(
      ['Title', 'Type', 'Category', 'Status', 'Published', 'Slug'],
      filtered.map((p) => [
        p.title,
        POST_TYPE_LABELS[p.type],
        p.category_name ?? '',
        p.is_published ? 'Published' : 'Draft',
        p.published_at ? NPT_DATE.format(new Date(p.published_at)) : '',
        p.slug,
      ]),
    );
    downloadCsv('news-posts.csv', csv);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <select
          aria-label="Filter by type"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as 'all' | PostType)}
          className={selectClass}
        >
          <option value="all">All types</option>
          {POST_TYPES.map((t) => (
            <option key={t} value={t}>
              {POST_TYPE_LABELS[t]}
            </option>
          ))}
        </select>

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
          {filtered.length} post{filtered.length === 1 ? '' : 's'}
        </span>

        <button
          type="button"
          onClick={exportCsv}
          className="ml-auto rounded-sm border border-line px-3 py-1.5 text-sm font-medium transition-colors hover:bg-green-mist"
        >
          Export CSV
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-6 text-sm text-ink-muted">No posts match these filters.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line rounded-md border border-line">
          {filtered.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">{p.title}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                  <span className="badge badge-neutral uppercase">
                    {POST_TYPE_LABELS[p.type]}
                  </span>
                  {p.category_name && <span>{p.category_name}</span>}
                  <span>
                    {p.published_at
                      ? NPT_DATE.format(new Date(p.published_at))
                      : NPT_DATE.format(new Date(p.created_at))}
                  </span>
                </p>
              </div>

              <span
                className={[
                  'badge',
                  p.is_published ? 'badge-neutral' : 'badge-warning',
                ].join(' ')}
              >
                {p.is_published ? 'Published' : 'Draft'}
              </span>

              <Link
                href={`/admin/news/${p.id}/edit`}
                className="rounded-sm border border-line px-3 py-1 text-sm font-medium transition-colors hover:bg-green-mist"
              >
                Edit
              </Link>

              <form action={togglePublish}>
                <input type="hidden" name="id" value={p.id} />
                <input
                  type="hidden"
                  name="publish"
                  value={p.is_published ? 'false' : 'true'}
                />
                <button
                  type="submit"
                  className="rounded-sm border border-line px-3 py-1 text-sm font-medium transition-colors hover:bg-green-mist"
                >
                  {p.is_published ? 'Unpublish' : 'Publish'}
                </button>
              </form>

              <form action={deletePost}>
                <input type="hidden" name="id" value={p.id} />
                <ConfirmSubmitButton
                  confirmText={`Delete "${p.title}"? This cannot be undone.`}
                  className="rounded-sm border border-line px-3 py-1 text-sm font-medium text-danger transition-colors hover:bg-danger-bg"
                >
                  Delete
                </ConfirmSubmitButton>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
