import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { cloudinaryImage } from '@/lib/cloudinary-url';
import { Band } from '@/components/band';
import {
  POST_TYPES,
  POST_TYPE_LABELS,
  type NewsCategory,
  type PostType,
} from '@/lib/news';
import { NPT_DATE } from '@/lib/dates';

export const metadata: Metadata = {
  title: 'News & Events',
  description:
    'Latest news, events, and notices from Modern College & School, Bhaktapur.',
};

type PublicPostRow = {
  id: string;
  title: string;
  slug: string;
  type: PostType;
  excerpt: string | null;
  cover_image: string | null;
  published_at: string | null;
  category: { name: string } | { name: string }[] | null;
};

function categoryName(category: PublicPostRow['category']): string | null {
  if (!category) return null;
  return Array.isArray(category) ? (category[0]?.name ?? null) : category.name;
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; category?: string }>;
}) {
  const { type, category } = await searchParams;
  const supabase = await createClient();
  const cloud = process.env.CLOUDINARY_CLOUD_NAME ?? '';

  const activeType = POST_TYPES.includes(type as PostType)
    ? (type as PostType)
    : null;
  const activeCategory = category || null;

  const { data: categoriesData } = await supabase
    .from('news_categories')
    .select('id, name, display_order')
    .order('display_order', { ascending: true });
  const categories = (categoriesData ?? []) as NewsCategory[];

  // RLS returns only published rows to the public.
  let query = supabase
    .from('posts')
    .select(
      'id, title, slug, type, excerpt, cover_image, published_at, category:news_categories(name)',
    )
    .eq('is_published', true)
    .order('published_at', { ascending: false });
  if (activeType) query = query.eq('type', activeType);
  if (activeCategory) query = query.eq('category_id', activeCategory);

  const { data: postsData } = await query;
  const posts = (postsData ?? []) as PublicPostRow[];

  const hrefFor = (t: string | null, c: string | null) => {
    const sp = new URLSearchParams();
    if (t) sp.set('type', t);
    if (c) sp.set('category', c);
    const qs = sp.toString();
    return qs ? `/news?${qs}` : '/news';
  };

  const chip = (active: boolean) =>
    [
      'rounded-full px-3 py-1 text-sm transition-colors',
      active
        ? 'bg-green-brand text-white'
        : 'bg-green-mist text-green-ink hover:bg-green-pale',
    ].join(' ');

  return (
    <Band tone="paper">
      <p className="text-eyebrow uppercase tracking-wide text-green-brand">
        Latest
      </p>
      <h1 className="mt-2 font-display text-h1 text-green-ink">News &amp; events</h1>

      {/* Filters */}
      <div className="mt-8 space-y-3">
        <div className="flex flex-wrap gap-2">
          <Link href={hrefFor(null, activeCategory)} className={chip(!activeType)}>
            All types
          </Link>
          {POST_TYPES.map((t) => (
            <Link
              key={t}
              href={hrefFor(t, activeCategory)}
              className={chip(activeType === t)}
            >
              {POST_TYPE_LABELS[t]}
            </Link>
          ))}
        </div>

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Link
              href={hrefFor(activeType, null)}
              className={chip(!activeCategory)}
            >
              All categories
            </Link>
            {categories.map((c) => (
              <Link
                key={c.id}
                href={hrefFor(activeType, c.id)}
                className={chip(activeCategory === c.id)}
              >
                {c.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Posts */}
      {posts.length === 0 ? (
        <p className="mt-10 text-ink-muted">No posts to show yet.</p>
      ) : (
        <div className="mt-10 grid-auto-fit">
          {posts.map((post) => {
            const cover = post.cover_image
              ? cloudinaryImage(cloud, post.cover_image, 'c_fill,ar_16:9,w_800')
              : '';
            return (
              <Link
                key={post.id}
                href={`/news/${post.slug}`}
                className="group flex flex-col overflow-hidden rounded-md border border-line bg-surface transition-transform duration-200 hover:-translate-y-0.5 hover:border-green-pale"
              >
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cover}
                    alt=""
                    className="aspect-video w-full object-cover"
                  />
                ) : (
                  <div className="aspect-video w-full bg-green-mist" />
                )}
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                    <span className="badge badge-neutral uppercase">
                      {POST_TYPE_LABELS[post.type]}
                    </span>
                    {categoryName(post.category) && (
                      <span>{categoryName(post.category)}</span>
                    )}
                    {post.published_at && (
                      <span>{NPT_DATE.format(new Date(post.published_at))}</span>
                    )}
                  </div>
                  <h2 className="mt-2 font-display text-h3 text-green-ink">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="mt-2 flex-1 text-small text-ink-muted">
                      {post.excerpt}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Band>
  );
}
