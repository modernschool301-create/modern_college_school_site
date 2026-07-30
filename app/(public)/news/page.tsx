import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Band } from '@/components/band';
import { Reveal } from '@/components/reveal';
import { CardGrid } from '@/components/card-grid';
import { ContentCard } from '@/components/content-card';
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
        // A single Reveal fades the whole grid in; ContentCards must be direct
        // grid children for subgrid, so per-card stagger is not used (see Part 1).
        <Reveal className="mt-10">
          <CardGrid variant="media">
            {posts.map((post) => (
              <ContentCard
                key={post.id}
                href={`/news/${post.slug}`}
                // Cover switched from 16:9 to ContentCard's fixed 4:3 for a single
                // consistent media shape across the card system. Null cover → the
                // no-image green panel (replaces the old bg-green-mist block).
                media={{
                  cloudName: cloud,
                  publicId: post.cover_image,
                  alt: post.title,
                }}
                meta={
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
                }
                title={post.title}
                // Excerpt is PLAIN TEXT (not markdown, unlike achievements).
                body={
                  post.excerpt ? (
                    <p className="text-small text-ink-muted">{post.excerpt}</p>
                  ) : undefined
                }
              />
            ))}
          </CardGrid>
        </Reveal>
      )}
    </Band>
  );
}
