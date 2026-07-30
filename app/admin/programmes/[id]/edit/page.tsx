import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProgrammeForm } from '@/components/admin/programmes/programme-form';
import {
  ProgrammeFacultySection,
  type AdminFacultyRow,
} from '@/components/admin/programmes/programme-faculty';
import { updateProgramme } from '../../actions';
import type { Programme } from '@/lib/programmes';

// Like the Gallery album editor, this screen manages TWO things: the programme's
// own fields, and the programme's faculty rows. They are separate forms posting
// to separate actions — saving the programme redirects back to the list, while
// faculty actions stay here, so the two never fight over one submit.
export default async function EditProgrammePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from('programmes')
    .select('*')
    .eq('id', id)
    .single();

  if (!data) notFound();

  const programme = data as Programme;

  const { data: facultyData } = await supabase
    .from('programme_faculty')
    .select('id, name, qualification, photo, display_order')
    .eq('programme_id', programme.id)
    .order('display_order', { ascending: true });

  const faculty = (facultyData ?? []) as AdminFacultyRow[];
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? '';

  // Bind the id so the form's action matches (state, formData) => state.
  const action = updateProgramme.bind(null, programme.id);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href="/admin/programmes"
        className="text-sm text-ink-muted hover:text-ink"
      >
        ← Back to Programmes
      </Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-h2 text-green-ink">Edit programme</h1>
        {programme.is_published && (
          <Link
            href={`/programmes/${programme.slug}`}
            className="text-sm text-green-brand hover:underline"
          >
            View on the site →
          </Link>
        )}
      </div>

      <div className="mt-8">
        <ProgrammeForm
          action={action}
          cloudName={cloudName}
          initial={{
            title: programme.title,
            slug: programme.slug,
            level: programme.level,
            intro: programme.intro,
            body: programme.body,
            cover_image: programme.cover_image,
            is_published: programme.is_published,
          }}
        />
      </div>

      <hr className="mt-12 border-line" />

      <div className="mt-12">
        <ProgrammeFacultySection
          programmeId={programme.id}
          faculty={faculty}
          cloudName={cloudName}
        />
      </div>
    </main>
  );
}
