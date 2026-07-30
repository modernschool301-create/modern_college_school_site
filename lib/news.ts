// Shared News module constants + helpers (reused by admin and public sides).

export const POST_TYPES = ['news', 'event', 'notice'] as const;
export type PostType = (typeof POST_TYPES)[number];

export const POST_TYPE_LABELS: Record<PostType, string> = {
  news: 'News',
  event: 'Event',
  notice: 'Notice',
};

export type Post = {
  id: string;
  title: string;
  slug: string;
  type: PostType;
  excerpt: string | null;
  body: string | null;
  cover_image: string | null;
  category_id: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type NewsCategory = {
  id: string;
  name: string;
  display_order: number;
};

// URL-safe slug from a title. Editable by the admin; uniqueness is enforced by
// the DB constraint + a server-side check.
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
