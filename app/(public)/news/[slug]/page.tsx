import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createClient } from '@/lib/supabase/server';
import { cloudinaryImage } from '@/lib/cloudinary-url';
import { Band } from '@/components/band';
import { POST_TYPE_LABELS, type PostType } from '@/lib/news';
import { NPT_DATE } from '@/lib/dates';

type DetailPost = {
  title: string;
  type: PostType;
  excerpt: string | null;
  body: string | null;
  cover_image: string | null;
  published_at: string | null;
  created_at: string;
  category: { name: string } | { name: string }[] | null;
};

async function fetchPost(slug: string): Promise<DetailPost | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('posts')
    .select(
      'title, type, excerpt, body, cover_image, published_at, created_at, category:news_categories(name)',
    )
    .eq('slug', slug)
    .eq('is_published', true) // public URL only ever serves published posts
    .single();
  return (data as DetailPost) ?? null;
}

function categoryName(category: DetailPost['category']): string | null {
  if (!category) return null;
  return Array.isArray(category) ? (category[0]?.name ?? null) : category.name;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt ?? undefined,
  };
}

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await fetchPost(slug);
  if (!post) notFound();

  const cloud = process.env.CLOUDINARY_CLOUD_NAME ?? '';
  const cover = post.cover_image
    ? cloudinaryImage(cloud, post.cover_image, 'c_fill,ar_16:9,w_1200')
    : '';
  const date = post.published_at ?? post.created_at;

  return (
    <Band tone="paper">
      <article className="mx-auto max-w-3xl">
        <Link
          href="/news"
          className="text-sm text-ink-muted hover:text-ink"
        >
          ← All news
        </Link>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-small text-ink-muted">
          <span className="badge badge-neutral uppercase">
            {POST_TYPE_LABELS[post.type]}
          </span>
          {categoryName(post.category) && <span>{categoryName(post.category)}</span>}
          <span>{NPT_DATE.format(new Date(date))}</span>
        </div>

        <h1 className="mt-3 font-display text-h1 text-green-ink">{post.title}</h1>

        {post.excerpt && (
          <p className="mt-4 text-lead text-ink-muted">{post.excerpt}</p>
        )}

        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            className="mt-8 aspect-video w-full rounded-lg object-cover"
          />
        )}

        {post.body && (
          <div className="rich-text mt-8">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body}</ReactMarkdown>
          </div>
        )}
      </article>
    </Band>
  );
}
