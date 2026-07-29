'use client';

import type { NewsCategory } from '@/lib/news';
import {
  createCategory,
  renameCategory,
  deleteCategory,
  moveCategory,
} from '@/app/admin/news/actions';
import { ConfirmSubmitButton } from '@/components/admin/confirm-submit-button';

// Small add / rename / reorder / delete panel for news_categories. Deleting a
// category leaves its posts un-categorised (ON DELETE SET NULL), never deletes
// them.
export function CategoryManager({
  categories,
}: {
  categories: NewsCategory[];
}) {
  return (
    <div className="rounded-md border border-line p-4">
      <h2 className="font-display text-h3 text-green-ink">Categories</h2>

      <form action={createCategory} className="mt-3 flex gap-2">
        <input
          name="name"
          required
          placeholder="New category name"
          className="flex-1 px-3 py-1.5 text-sm"
        />
        <button
          type="submit"
          className="rounded-sm border border-line px-3 py-1.5 text-sm font-medium transition-colors hover:bg-green-mist"
        >
          Add
        </button>
      </form>

      {categories.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">No categories yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {categories.map((c, i) => (
            <li key={c.id} className="flex items-center gap-2">
              <form action={renameCategory} className="flex flex-1 gap-2">
                <input type="hidden" name="id" value={c.id} />
                <input
                  name="name"
                  defaultValue={c.name}
                  className="flex-1 px-2 py-1 text-sm"
                />
                <button
                  type="submit"
                  className="rounded-sm border border-line px-2 py-1 text-xs font-medium transition-colors hover:bg-green-mist"
                >
                  Save
                </button>
              </form>

              <form action={moveCategory}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="direction" value="up" />
                <button
                  type="submit"
                  disabled={i === 0}
                  aria-label="Move up"
                  className="rounded-sm border border-line px-2 py-1 text-xs disabled:opacity-40"
                >
                  ↑
                </button>
              </form>
              <form action={moveCategory}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="direction" value="down" />
                <button
                  type="submit"
                  disabled={i === categories.length - 1}
                  aria-label="Move down"
                  className="rounded-sm border border-line px-2 py-1 text-xs disabled:opacity-40"
                >
                  ↓
                </button>
              </form>

              <form action={deleteCategory}>
                <input type="hidden" name="id" value={c.id} />
                <ConfirmSubmitButton
                  confirmText={`Delete category "${c.name}"? Its posts stay, un-categorised.`}
                  className="rounded-sm border border-line px-2 py-1 text-xs font-medium text-danger transition-colors hover:bg-danger-bg"
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
