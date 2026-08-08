import { Band } from '@/components/band';
import { createClient } from '@/lib/supabase/server';
import {
  AchievementCards,
  type AchievementCardData,
} from './achievement-cards';

// Achievements teaser on the homepage — what the school's students and staff
// have won, between the programmes on offer and what students say about them.
//
// This half is a SERVER component (the same shape as LeadershipMessages): it
// reads the published rows and decides whether the section exists at all. The
// cards and their shared dialog need click handlers and focus management, so
// they live in the sibling client component, which this hands the rows to.
export async function AchievementsPreview() {
  const supabase = await createClient();
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? '';

  // The SAME read and the SAME ordering as /achievements — the editor-controlled
  // display_order, not recency. This teaser is a prefix of that page's order, so
  // the first cards here are the first cards there; a differently-sorted teaser
  // would make the full list look shuffled to anyone who followed it.
  //
  // is_published is filtered EXPLICITLY as well as by RLS: the authenticated
  // SELECT policy lets an active admin see drafts, and an admin looking at the
  // public homepage should see the public homepage, not a preview of their own
  // unpublished rows.
  const { data } = await supabase
    .from('achievements')
    .select('id, title, description, image, achieved_on')
    .eq('is_published', true)
    .order('display_order', { ascending: true });

  const achievements = (data ?? []) as AchievementCardData[];

  // Nothing published → the section does not render at all (no heading, no
  // band, no empty track), the same rule Leadership and the faculty and
  // specialization sections follow at zero rows. The /achievements page has its
  // own empty state because it is a destination someone navigated to on
  // purpose; a homepage teaser has nothing to apologise for and simply is not
  // there.
  if (achievements.length === 0) return null;

  return (
    // surface — ProgrammesOverview above is `mist` and VoicePreview below is
    // `paper`, so this is the one light tone that repeats neither neighbour and
    // keeps the homepage's no-two-adjacent-identical-tones rule intact.
    <Band tone="surface">
      <AchievementCards achievements={achievements} cloudName={cloudName} />
    </Band>
  );
}
