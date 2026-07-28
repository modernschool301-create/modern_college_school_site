'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const ALLOWED_STATUSES = ['new', 'read', 'archived'] as const;
type Status = (typeof ALLOWED_STATUSES)[number];

// Advance a message's triage status (new -> read -> archived). Uses the cookie
// (anon-key) server client: the write is permitted by the admin UPDATE policy
// (current_user_is_active_admin()), NOT the service key — this is an
// authenticated admin acting under RLS. There is no delete path anywhere;
// archiving is a status change (CLAUDE.md / PRD 9.5).
export async function setContactStatus(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');

  if (!id || !ALLOWED_STATUSES.includes(status as Status)) {
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('contact_messages')
    .update({ status })
    .eq('id', id);

  if (error) {
    console.error('contact status update failed:', error.message);
    return;
  }

  revalidatePath('/admin/contact-messages');
}
