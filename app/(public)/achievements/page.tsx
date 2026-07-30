import type { Metadata } from 'next';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createClient } from '@/lib/supabase/server';
import { cloudinaryImage } from '@/lib/cloudinary-url';
import { Band } from '@/components/band';
import { Reveal } from '@/components/reveal';
import { NPT_DATE } from '@/lib/dates';
import type { Achievement } from '@/lib/achievements';

const TITLE = 'Achievements';
const DESCRIPTION =
  'Awards, results, and recognition earned by the students and staff of Modern College & School, Bhaktapur.';

// Open Graph per PRD 10.6 — a shared link renders as an official card. The list
// page has no single image of its own, so it falls back to the institution logo.
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    images: cloudinaryImage(
      process.env.CLOUDINARY_CLOUD_NAME ?? '',
      'modern/logo1',
      'c_pad,b_white,w_1200,h_630',
    ),
  },
};

type PublicAchievement = Pick<
  Achievement,
  'id' | 'title' | 'description' | 'image' | 'achieved_on'
>;

export default async function AchievementsPage() {
  const supabase = await createClient();
  const cloud = process.env.CLOUDINARY_CLOUD_NAME ?? '';

  // One read (PRD 19). RLS returns only published rows to the public; the
  // editor-controlled display_order decides the sequence, not recency.
  const { data } = await supabase
    .from('achievements')
    .select('id, title, description, image, achieved_on')
    .eq('is_published', true)
    .order('display_order', { ascending: true });

  const achievements = (data ?? []) as PublicAchievement[];

  return (
    <Band tone="paper">
      <Reveal>
        <p className="text-eyebrow uppercase tracking-wide text-green-brand">
          Recognition
        </p>
        <h1 className="mt-2 max-w-2xl font-display text-h1 text-green-ink">
          {TITLE}
        </h1>
        <p className="mt-4 max-w-2xl text-lead text-ink-muted">
          What our students and staff have won, achieved, and been recognised for.
        </p>
      </Reveal>

      {achievements.length === 0 ? (
        <Reveal className="mt-12 rounded-md border border-line bg-surface p-10 text-center">
          <p className="font-display text-h3 text-green-ink">
            The first achievements are on their way
          </p>
          <p className="mx-auto mt-3 max-w-md text-ink-muted">
            We are gathering this year&rsquo;s results and awards. In the meantime,
            our news page carries the latest from the campus.
          </p>
          <Link
            href="/news"
            className="mt-6 inline-block rounded-sm border border-green-brand px-5 py-2.5 text-sm font-medium text-green-brand transition-colors hover:bg-green-mist"
          >
            Read the latest news
          </Link>
        </Reveal>
      ) : (
        <Reveal stagger className="mt-12 grid-auto-fit">
          {achievements.map((achievement) => {
            const image = achievement.image
              ? cloudinaryImage(cloud, achievement.image, 'c_fill,ar_4:3,w_800')
              : '';
            return (
              <article
                key={achievement.id}
                className="flex flex-col overflow-hidden rounded-md border border-line bg-surface transition-transform duration-200 hover:-translate-y-0.5 hover:border-green-pale"
              >
                {image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={image}
                    alt={achievement.title}
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover"
                  />
                )}
                <div className="flex flex-1 flex-col p-6">
                  {achievement.achieved_on && (
                    <p className="text-xs text-ink-muted">
                      {NPT_DATE.format(new Date(achievement.achieved_on))}
                    </p>
                  )}
                  <h2 className="mt-2 font-display text-h3 text-green-ink">
                    {achievement.title}
                  </h2>
                  {achievement.description && (
                    <div className="rich-text mt-3 flex-1 text-small">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {achievement.description}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </Reveal>
      )}
    </Band>
  );
}
