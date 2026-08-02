'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { cloudinaryImage } from '@/lib/cloudinary-url';
import { toCsv, downloadCsv } from '@/lib/csv';
import { ConfirmSubmitButton } from '@/components/admin/confirm-submit-button';
import {
  togglePublish,
  deleteLeadershipMessage,
  moveLeadershipMessage,
} from '@/app/admin/leadership/actions';

export type AdminLeadershipRow = {
  id: string;
  name: string;
  title: string;
  photo: string | null;
  excerpt: string;
  full_message: string | null;
  display_order: number;
  is_published: boolean;
  created_at: string;
};

const selectClass = 'px-2 py-1.5 text-sm';
const actionClass =
  'rounded-sm border border-line px-3 py-1 text-sm font-medium transition-colors hover:bg-green-mist';

// A short preview of the statement for the dense admin list — the full text
// lives on the edit form and the homepage card.
function preview(excerpt: string): string {
  const trimmed = excerpt.trim();
  return trimmed.length > 90 ? `${trimmed.slice(0, 90)}…` : trimmed;
}

export function LeadershipList({
  messages,
  cloudName,
}: {
  messages: AdminLeadershipRow[];
  cloudName: string;
}) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>(
    'all',
  );

  const filtered = useMemo(() => {
    return messages.filter((m) => {
      if (statusFilter === 'published' && !m.is_published) return false;
      if (statusFilter === 'draft' && m.is_published) return false;
      return true;
    });
  }, [messages, statusFilter]);

  // Reorder acts on the TRUE neighbour in the full display_order sequence, so
  // the arrows are disabled from the unfiltered position — never the filtered
  // one, which would let a filtered view offer a move that does nothing.
  const lastIndex = messages.length - 1;
  const positions = useMemo(
    () => new Map(messages.map((m, i) => [m.id, i])),
    [messages],
  );

  function exportCsv() {
    const csv = toCsv(
      ['Name', 'Title', 'Statement', 'Full message', 'Status', 'Order'],
      filtered.map((m) => [
        m.name,
        m.title,
        m.excerpt,
        // The markdown body would swamp a spreadsheet cell, so the export
        // records only WHETHER there is one — which is the fact that decides
        // whether the public card gets a button.
        m.full_message?.trim() ? 'Yes' : 'No',
        m.is_published ? 'Published' : 'Draft',
        m.display_order,
      ]),
    );
    downloadCsv('leadership-messages.csv', csv);
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
          {filtered.length} message{filtered.length === 1 ? '' : 's'}
        </span>

        <button type="button" onClick={exportCsv} className={`ml-auto ${actionClass}`}>
          Export CSV
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-6 text-sm text-ink-muted">
          {messages.length === 0
            ? 'No leadership messages yet. Add the first one to show it on the homepage.'
            : 'No messages match this filter.'}
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line rounded-md border border-line">
          {filtered.map((m) => {
            const position = positions.get(m.id) ?? 0;
            const thumb = m.photo
              ? cloudinaryImage(cloudName, m.photo, 'c_fill,g_face,ar_1:1,w_120')
              : '';
            return (
              <li
                key={m.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 p-4"
              >
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumb}
                    alt={`Photo of ${m.name}`}
                    className="h-12 w-12 shrink-0 rounded-full border border-line object-cover"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="h-12 w-12 shrink-0 rounded-full border border-line bg-green-mist"
                  />
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{m.name}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                    <span>{m.title}</span>
                    <span>Order {m.display_order}</span>
                    {/* Surfaced because it changes what the homepage renders:
                        no full message means no "Read full message" button. */}
                    {!m.full_message?.trim() && <span>No full message</span>}
                  </p>
                  <p className="mt-1 truncate text-xs text-ink-muted">
                    {preview(m.excerpt)}
                  </p>
                </div>

                <span
                  className={[
                    'badge',
                    m.is_published ? 'badge-neutral' : 'badge-warning',
                  ].join(' ')}
                >
                  {m.is_published ? 'Published' : 'Draft'}
                </span>

                {/* Reorder */}
                <div className="flex items-center gap-1">
                  <form action={moveLeadershipMessage}>
                    <input type="hidden" name="id" value={m.id} />
                    <input type="hidden" name="direction" value="up" />
                    <button
                      type="submit"
                      disabled={position === 0}
                      aria-label={`Move ${m.name} up`}
                      className={`${actionClass} disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent`}
                    >
                      ↑
                    </button>
                  </form>
                  <form action={moveLeadershipMessage}>
                    <input type="hidden" name="id" value={m.id} />
                    <input type="hidden" name="direction" value="down" />
                    <button
                      type="submit"
                      disabled={position === lastIndex}
                      aria-label={`Move ${m.name} down`}
                      className={`${actionClass} disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent`}
                    >
                      ↓
                    </button>
                  </form>
                </div>

                <Link href={`/admin/leadership/${m.id}/edit`} className={actionClass}>
                  Edit
                </Link>

                <form action={togglePublish}>
                  <input type="hidden" name="id" value={m.id} />
                  <input
                    type="hidden"
                    name="publish"
                    value={m.is_published ? 'false' : 'true'}
                  />
                  <button type="submit" className={actionClass}>
                    {m.is_published ? 'Unpublish' : 'Publish'}
                  </button>
                </form>

                <form action={deleteLeadershipMessage}>
                  <input type="hidden" name="id" value={m.id} />
                  <ConfirmSubmitButton
                    confirmText={`Delete the message from ${m.name}? This cannot be undone.`}
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
