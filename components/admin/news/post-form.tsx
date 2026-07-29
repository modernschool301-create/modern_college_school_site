'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import {
  POST_TYPES,
  POST_TYPE_LABELS,
  slugify,
  type NewsCategory,
  type PostType,
} from '@/lib/news';
import { ImageUploadField } from '@/components/admin/image-upload-field';
import type { PostFormState } from '@/app/admin/news/actions';

type PostInitial = {
  title?: string;
  slug?: string;
  type?: PostType;
  excerpt?: string | null;
  body?: string | null;
  cover_image?: string | null;
  category_id?: string | null;
  is_published?: boolean;
};

const inputClass = 'w-full px-3 py-2 text-sm';

export function PostForm({
  action,
  initial = {},
  categories,
  cloudName,
}: {
  action: (state: PostFormState, formData: FormData) => Promise<PostFormState>;
  initial?: PostInitial;
  categories: NewsCategory[];
  cloudName: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });

  const [title, setTitle] = useState(initial.title ?? '');
  const [slug, setSlug] = useState(initial.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.slug));

  // Auto-fill the slug from the title until the admin edits it by hand.
  function onTitle(value: string) {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      <div className="space-y-1.5">
        <label htmlFor="title" className="block text-sm font-medium">
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          value={title}
          onChange={(e) => onTitle(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="slug" className="block text-sm font-medium">
          Slug <span className="text-ink-faint">(web address)</span>
        </label>
        <input
          id="slug"
          name="slug"
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugTouched(true);
          }}
          className={inputClass}
        />
        <p className="text-xs text-ink-muted">
          Must be unique. A number is appended automatically if it clashes.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="type" className="block text-sm font-medium">
            Type
          </label>
          <select
            id="type"
            name="type"
            defaultValue={initial.type ?? 'news'}
            className={inputClass}
          >
            {POST_TYPES.map((t) => (
              <option key={t} value={t}>
                {POST_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="category_id" className="block text-sm font-medium">
            Category
          </label>
          <select
            id="category_id"
            name="category_id"
            defaultValue={initial.category_id ?? ''}
            className={inputClass}
          >
            <option value="">— None —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="excerpt" className="block text-sm font-medium">
          Excerpt <span className="text-ink-faint">(short summary)</span>
        </label>
        <textarea
          id="excerpt"
          name="excerpt"
          rows={2}
          defaultValue={initial.excerpt ?? ''}
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="body" className="block text-sm font-medium">
          Body <span className="text-ink-faint">(Markdown supported)</span>
        </label>
        <textarea
          id="body"
          name="body"
          rows={12}
          defaultValue={initial.body ?? ''}
          className={`${inputClass} font-mono`}
        />
      </div>

      <ImageUploadField
        name="cover_image"
        purpose="news-image"
        cloudName={cloudName}
        initialPublicId={initial.cover_image ?? ''}
      />

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="is_published"
          defaultChecked={initial.is_published ?? false}
          className="h-4 w-4"
        />
        Published (visible to the public)
      </label>

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary text-sm">
          {pending ? 'Saving…' : 'Save post'}
        </button>
        <Link href="/admin/news" className="text-sm text-ink-muted hover:text-ink">
          Cancel
        </Link>
      </div>
    </form>
  );
}
