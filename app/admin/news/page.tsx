import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PostList, type AdminPostRow } from '@/components/admin/news/post-list';
import { CategoryManager } from '@/components/admin/news/category-manager';
import type { NewsCategory, PostType } from '@/lib/news';

// Admin-only (the /admin layout enforces the live active-admin check). The admin
// RLS policy returns ALL posts here, drafts included.
export default async function AdminNewsPage() {
  const supabase = await createClient();

  const [{ data: postsData }, { data: categoriesData }] = await Promise.all([
    supabase
      .from('posts')
      .select(
        'id, title, slug, type, is_published, published_at, created_at, category:news_categories(name)',
      )
      .order('created_at', { ascending: false }),
    supabase
      .from('news_categories')
      .select('id, name, display_order')
      .order('display_order', { ascending: true }),
  ]);

  const posts: AdminPostRow[] = (postsData ?? []).map((p) => {
    const category = p.category as { name: string } | { name: string }[] | null;
    const categoryName = Array.isArray(category)
      ? (category[0]?.name ?? null)
      : (category?.name ?? null);
    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      type: p.type as PostType,
      category_name: categoryName,
      is_published: p.is_published,
      published_at: p.published_at,
      created_at: p.created_at,
    };
  });

  const categories = (categoriesData ?? []) as NewsCategory[];

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-h2 text-green-ink">News &amp; Events</h1>
        <Link href="/admin/news/new" className="btn-primary text-sm">
          New post
        </Link>
      </div>

      <div className="mt-8">
        <PostList posts={posts} />
      </div>

      <div className="mt-10 max-w-xl">
        <CategoryManager categories={categories} />
      </div>
    </main>
  );
}
