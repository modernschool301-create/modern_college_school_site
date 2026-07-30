import Link from 'next/link';
import { Band } from '@/components/band';
import { Reveal } from '@/components/reveal';
import { createClient } from '@/lib/supabase/server';
import { cloudinaryImage, FILLER_IMAGE } from '@/lib/cloudinary-url';
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
  // A lead with no cover falls back to the shared filler rather than a flat
  // colour block. Note the 16:9 here, not ContentCard's 4:3 — this lead is a
  // wide editorial slot, and the filler takes the shape of the slot it fills.
  const leadCover = cloudinaryImage(
    cloud,
    lead.cover_image ?? FILLER_IMAGE,
    'c_fill,ar_16:9,w_800',
  );

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
            // Decorative (alt=""): the card's own heading is the accessible
            // name, and for a filler lead there is nothing to describe.
            // max-h caps the DISPLAY height only — the fetched crop is still
            // 16:9. Past ~570px of column the 16:9 box would exceed 320px, so
            // object-cover trims the overflow instead of driving the whole card
            // taller and dwarfing the secondary column. Below that width the
            // cap is inert and the image is a plain uncropped 16:9.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={leadCover}
              alt=""
              className="aspect-video max-h-[320px] w-full object-cover"
            />
          ) : (
            // Only reachable if CLOUDINARY_CLOUD_NAME is unset, which makes
            // every delivery URL empty — a missing cover now yields the filler,
            // not this block. Kept so a misconfigured env degrades to a plain
            // panel instead of a broken <img>.
            <div className="aspect-video max-h-[320px] w-full bg-green-pale" />
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

        {/* Secondary items — dense horizontal list items: thumbnail left, meta
            and title right, no excerpt. The column still stretches beside the
            lead, but the items themselves carry no flex-grow, so each sizes to
            its own content and the column simply ends short of the lead rather
            than inflating two cards into tall empty panels. */}
        {secondary.length > 0 && (
          <div className="flex flex-col gap-6">
            {secondary.map((post) => {
              // Same filler fallback as the lead, at the thumbnail's own crop:
              // 4:3 like ContentCard, at 400w for a ≤180px box on 2× screens.
              const thumb = cloudinaryImage(
                cloud,
                post.cover_image ?? FILLER_IMAGE,
                'c_fill,ar_4:3,w_400',
              );
              return (
                <Link
                  key={post.slug}
                  href={`/news/${post.slug}`}
                  className="flex items-stretch overflow-hidden rounded-md border border-line bg-surface transition-transform duration-200 hover:-translate-y-0.5 hover:border-green-pale"
                >
                  {/* Full-bleed on the left: self-stretch + object-cover makes
                      the thumbnail take the item's height whatever the title
                      wraps to, so there is never a gap under it. 180px is the
                      target, but at 375px that would leave the title a ~125px
                      measure, so it steps 112px → 180px at sm where the row has
                      the room — the image shrinks rather than the text wrapping
                      beneath it. shrink-0 stops it collapsing further. */}
                  {thumb ? (
                    // Decorative (alt=""): the title is the link's accessible
                    // name, and a filler thumbnail has nothing to describe.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumb}
                      alt=""
                      loading="lazy"
                      className="w-28 shrink-0 self-stretch object-cover sm:w-[180px]"
                    />
                  ) : (
                    // Unset CLOUDINARY_CLOUD_NAME only — see the lead above.
                    <div className="w-28 shrink-0 self-stretch bg-green-pale sm:w-[180px]" />
                  )}
                  {/* min-w-0 lets the text block shrink inside the flex row so
                      a long title wraps instead of forcing overflow. */}
                  <div className="min-w-0 p-4 sm:p-5">
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
                    {/* One clamped line — enough to give the item substance
                        without turning it into a second lead. line-clamp needs
                        a min-w-0 parent (above) or the ellipsis never triggers. */}
                    {post.excerpt && (
                      <p className="mt-1 line-clamp-1 text-small text-ink-muted">
                        {post.excerpt}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </Band>
  );
}
