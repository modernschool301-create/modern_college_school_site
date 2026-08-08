import { Band } from '@/components/band';
import { createClient } from '@/lib/supabase/server';
import {
  LeadershipMessageCards,
  type LeadershipCardData,
} from './leadership-message-cards';

// Leadership Messages on the homepage — the school's own voice, directly under
// the hero.
//
// This half is a SERVER component (the same shape as NewsTeaser): it reads the
// published rows and decides whether the section exists at all. The cards and
// their shared dialog need click handlers and focus management, so they live in
// the sibling client component, which this hands the rows to.
//
// There is no dedicated public route for this module — the homepage is the only
// place it appears — so the admin actions revalidate '/' and that refreshes
// exactly this.
export async function LeadershipMessages() {
  const supabase = await createClient();
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? '';

  // is_published is filtered EXPLICITLY as well as by RLS: the authenticated
  // SELECT policy lets an active admin see drafts, and an admin looking at the
  // public homepage should see the public homepage, not a preview of their own
  // unpublished rows.
  const { data } = await supabase
    .from('leadership_messages')
    .select('id, name, title, photo, excerpt, full_message')
    .eq('is_published', true)
    .order('display_order', { ascending: true });

  const messages = (data ?? []) as LeadershipCardData[];

  // Nothing published → the section does not render at all (no heading, no
  // band, no empty grid), the same rule the faculty and specialization sections
  // follow at zero rows. An empty "our leadership" block would read as an
  // omission; no block at all reads as a page that simply does not have one.
  if (messages.length === 0) return null;

  return (
    // The Band — and therefore the tone — stays here on the server side. The
    // heading, the conditional "scroll for more" line, the track and the shared
    // dialog all come from ScrollableCardDialog by way of the client component,
    // which is where the item count that governs them is already known.
    <Band tone="mist">
      <LeadershipMessageCards messages={messages} cloudName={cloudName} />
    </Band>
  );
}
