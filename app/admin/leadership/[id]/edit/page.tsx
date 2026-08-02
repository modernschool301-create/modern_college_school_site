import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LeadershipForm } from '@/components/admin/leadership/leadership-form';
import { updateLeadershipMessage } from '../../actions';
import type { LeadershipMessage } from '@/lib/leadership';

export default async function EditLeadershipMessagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from('leadership_messages')
    .select('*')
    .eq('id', id)
    .single();

  if (!data) notFound();

  const message = data as LeadershipMessage;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? '';

  // Bind the id so the form's action matches (state, formData) => state.
  const action = updateLeadershipMessage.bind(null, message.id);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href="/admin/leadership"
        className="text-sm text-ink-muted hover:text-ink"
      >
        ← Back to Leadership
      </Link>
      <h1 className="mt-3 font-display text-h2 text-green-ink">
        Edit leadership message
      </h1>

      <div className="mt-8">
        <LeadershipForm
          action={action}
          cloudName={cloudName}
          initial={{
            name: message.name,
            title: message.title,
            photo: message.photo,
            excerpt: message.excerpt,
            full_message: message.full_message,
            is_published: message.is_published,
          }}
        />
      </div>
    </main>
  );
}
