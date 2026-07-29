import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PostForm } from '@/components/admin/news/post-form';
import { updatePost } from '../../actions';
import type { NewsCategory, Post } from '@/lib/news';

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: post }, { data: categoriesData }] = await Promise.all([
    supabase.from('posts').select('*').eq('id', id).single(),
    supabase
      .from('news_categories')
      .select('id, name, display_order')
      .order('display_order', { ascending: true }),
  ]);

  if (!post) notFound();

  const typedPost = post as Post;
  const categories = (categoriesData ?? []) as NewsCategory[];
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? '';

  // Bind the post id so the form's action matches (state, formData) => state.
  const action = updatePost.bind(null, typedPost.id);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link href="/admin/news" className="text-sm text-ink-muted hover:text-ink">
        ← Back to News
      </Link>
      <h1 className="mt-3 font-display text-h2 text-green-ink">Edit post</h1>

      <div className="mt-8">
        <PostForm
          action={action}
          categories={categories}
          cloudName={cloudName}
          initial={{
            title: typedPost.title,
            slug: typedPost.slug,
            type: typedPost.type,
            excerpt: typedPost.excerpt,
            body: typedPost.body,
            cover_image: typedPost.cover_image,
            category_id: typedPost.category_id,
            is_published: typedPost.is_published,
          }}
        />
      </div>
    </main>
  );
}
