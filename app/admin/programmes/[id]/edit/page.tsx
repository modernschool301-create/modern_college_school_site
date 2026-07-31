import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProgrammeForm } from '@/components/admin/programmes/programme-form';
import {
  ProgrammeFacultySection,
  type AdminFacultyRow,
} from '@/components/admin/programmes/programme-faculty';
import {
  ProgrammeSpecializationsSection,
  type AdminSpecializationRow,
} from '@/components/admin/programmes/programme-specializations';
import { updateProgramme } from '../../actions';
import type { Programme } from '@/lib/programmes';

// Like the Gallery album editor, this screen manages a parent and its children —
// here the programme's own fields, its specializations, and its faculty rows.
// Every section is a separate form posting to a separate action: saving the
// programme redirects back to the list, while child actions stay here, so no two
// ever fight over one submit.
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

  const { data: specializationData } = await supabase
    .from('programme_specializations')
    .select('id, title, slug, description, image, display_order')
    .eq('programme_id', programme.id)
    .order('display_order', { ascending: true });

  const specializationRows = specializationData ?? [];

  // How many faculty each specialization has, so the list can say what is behind
  // its Edit link. ONE query for all of them, tallied here — not one per row.
  const specializationIds = specializationRows.map((s) => s.id as string);
  const { data: specFacultyRows } = specializationIds.length
    ? await supabase
        .from('specialization_faculty')
        .select('specialization_id')
        .in('specialization_id', specializationIds)
    : { data: [] };

  const facultyCounts = new Map<string, number>();
  for (const row of specFacultyRows ?? []) {
    const key = row.specialization_id as string;
    facultyCounts.set(key, (facultyCounts.get(key) ?? 0) + 1);
  }

  const faculty = (facultyData ?? []) as AdminFacultyRow[];
  const specializations = specializationRows.map((row) => ({
    ...row,
    facultyCount: facultyCounts.get(row.id as string) ?? 0,
  })) as AdminSpecializationRow[];
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

      {/* Specializations before faculty, the same order they appear in on the
          public page, so the edit screen reads like the page it produces. */}
      <div className="mt-12">
        <ProgrammeSpecializationsSection
          programmeId={programme.id}
          specializations={specializations}
          cloudName={cloudName}
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
