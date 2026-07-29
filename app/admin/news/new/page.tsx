import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PostForm } from '@/components/admin/news/post-form';
import { createPost } from '../actions';
import type { NewsCategory } from '@/lib/news';

export default async function NewPostPage() {
  const supabase = await createClient();
  const { data: categoriesData } = await supabase
    .from('news_categories')
    .select('id, name, display_order')
    .order('display_order', { ascending: true });

  const categories = (categoriesData ?? []) as NewsCategory[];
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? '';

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link href="/admin/news" className="text-sm text-ink-muted hover:text-ink">
        ← Back to News
      </Link>
      <h1 className="mt-3 font-display text-h2 text-green-ink">New post</h1>

      <div className="mt-8">
        <PostForm action={createPost} categories={categories} cloudName={cloudName} />
      </div>
    </main>
  );
}
