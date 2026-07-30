import type { Metadata } from 'next';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createClient } from '@/lib/supabase/server';
import { cloudinaryImage } from '@/lib/cloudinary-url';
import { Band } from '@/components/band';
import { Reveal } from '@/components/reveal';
import { CardGrid } from '@/components/card-grid';
import { ContentCard } from '@/components/content-card';
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
        // A single Reveal fades the whole grid in; ContentCards must be direct
        // grid children for subgrid, so per-card stagger is not used (see Part 1).
        <Reveal className="mt-12">
          <CardGrid variant="media">
            {achievements.map((achievement) => (
              <ContentCard
                key={achievement.id}
                // Null image → the no-image cover panel (green branded panel with
                // the title), never an empty frame or a logo stand-in.
                media={{
                  cloudName: cloud,
                  publicId: achievement.image,
                  alt: achievement.title,
                }}
                meta={
                  achievement.achieved_on ? (
                    <p className="text-xs text-ink-muted">
                      {NPT_DATE.format(new Date(achievement.achieved_on))}
                    </p>
                  ) : undefined
                }
                title={achievement.title}
                // Description stays MARKDOWN (bold, lists, links) in .rich-text.
                body={
                  achievement.description ? (
                    <div className="rich-text text-small">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {achievement.description}
                      </ReactMarkdown>
                    </div>
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
