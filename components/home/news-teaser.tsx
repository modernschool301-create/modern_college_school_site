import Link from 'next/link';
import { Band } from '@/components/band';
import { Reveal } from '@/components/reveal';
import { createClient } from '@/lib/supabase/server';
import { cloudinaryImage } from '@/lib/cloudinary-url';
import { POST_TYPE_LABELS, type PostType } from '@/lib/news';
import { NPT_DATE } from '@/lib/dates';

type TeaserPost = {
  title: string;
  slug: string;
  type: PostType;
  excerpt: string | null;
  cover_image: string | null;
  published_at: string | null;
};

// Real content: the newest published posts (RLS returns published only). The
// first is the lead, the next two are secondary. Revalidated by the News admin
// actions (they revalidate '/'), so publishing refreshes this automatically.
export async function NewsTeaser() {
  const supabase = await createClient();
  const cloud = process.env.CLOUDINARY_CLOUD_NAME ?? '';

  const { data } = await supabase
    .from('posts')
    .select('title, slug, type, excerpt, cover_image, published_at')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(3);

  const posts = (data ?? []) as TeaserPost[];

  // Nothing published yet → don't show an empty section.
  if (posts.length === 0) return null;

  const [lead, ...secondary] = posts;
  const leadCover = lead.cover_image
    ? cloudinaryImage(cloud, lead.cover_image, 'c_fill,ar_16:9,w_800')
    : '';

  return (
    <Band tone="mist">
      <Reveal className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-eyebrow uppercase tracking-wide text-green-brand">
            Latest
          </p>
          <h2 className="mt-2 font-display text-h2 text-green-ink">
            News &amp; events
          </h2>
        </div>
        <Link
          href="/news"
          className="text-small font-medium text-green-brand hover:underline"
        >
          View all news →
        </Link>
      </Reveal>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {/* Lead item */}
        <Link
          href={`/news/${lead.slug}`}
          className="group flex flex-col overflow-hidden rounded-md border border-line bg-surface transition-transform duration-200 hover:-translate-y-0.5 hover:border-green-pale"
        >
          {leadCover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={leadCover} alt="" className="aspect-video w-full object-cover" />
          ) : (
            <div className="aspect-video w-full bg-green-pale" />
          )}
          <div className="flex flex-1 flex-col justify-end p-8">
            <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
              <span className="badge badge-neutral uppercase">
                {POST_TYPE_LABELS[lead.type]}
              </span>
              {lead.published_at && (
                <span>{NPT_DATE.format(new Date(lead.published_at))}</span>
              )}
            </div>
            <h3 className="mt-3 font-display text-h3 text-green-ink">
              {lead.title}
            </h3>
            {lead.excerpt && (
              <p className="mt-2 text-small text-ink-muted">{lead.excerpt}</p>
            )}
          </div>
        </Link>

        {/* Secondary items */}
        {secondary.length > 0 && (
          <div className="flex flex-col gap-6">
            {secondary.map((post) => (
              <Link
                key={post.slug}
                href={`/news/${post.slug}`}
                className="flex flex-1 flex-col justify-center rounded-md border border-line bg-surface p-6 transition-transform duration-200 hover:-translate-y-0.5 hover:border-green-pale"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                  <span className="badge badge-neutral uppercase">
                    {POST_TYPE_LABELS[post.type]}
                  </span>
                  {post.published_at && (
                    <span>{NPT_DATE.format(new Date(post.published_at))}</span>
                  )}
                </div>
                <h3 className="mt-2 font-display text-h3 text-green-ink">
                  {post.title}
                </h3>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Band>
  );
}
