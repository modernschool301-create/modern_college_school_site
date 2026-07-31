import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SpecializationForm } from '@/components/admin/programmes/specialization-form';
import {
  SpecializationFacultySection,
  type AdminSpecializationFacultyRow,
} from '@/components/admin/programmes/specialization-faculty';
import { updateSpecialization } from '../../../../actions';
import type { Programme, ProgrammeSpecialization } from '@/lib/programmes';

// A specialization's own edit screen: its fields, plus its own faculty roster.
//
// It exists because the programme edit page was already carrying the programme's
// fields, its faculty, and its specializations — adding a THIRD roster (one per
// specialization) inline would have made that screen unusable. The split follows
// the same rule as everywhere else here: separate forms posting to separate
// actions, so saving fields and managing people never fight over one submit.
export default async function EditSpecializationPage({
  params,
}: {
  params: Promise<{ id: string; specializationId: string }>;
}) {
  const { id, specializationId } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from('programme_specializations')
    .select('*')
    .eq('id', specializationId)
    // Scoped to the programme in the URL, not just the id: a specialization id
    // reached under the WRONG programme is a 404, not a page that silently
    // renders under the wrong parent and saves back a mismatched programme_id.
    // Mirrors the public route's parent check.
    .eq('programme_id', id)
    .single();

  if (!data) notFound();

  const specialization = data as ProgrammeSpecialization;

  const { data: programmeData } = await supabase
    .from('programmes')
    .select('id, slug, title, is_published')
    .eq('id', id)
    .single();

  if (!programmeData) notFound();

  const programme = programmeData as Pick<
    Programme,
    'id' | 'slug' | 'title' | 'is_published'
  >;

  const { data: facultyData } = await supabase
    .from('specialization_faculty')
    .select('id, name, qualification, photo, display_order')
    .eq('specialization_id', specialization.id)
    .order('display_order', { ascending: true });

  const faculty = (facultyData ?? []) as AdminSpecializationFacultyRow[];
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? '';

  // Bind the id so the form's action matches (state, formData) => state.
  const action = updateSpecialization.bind(null, specialization.id);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href={`/admin/programmes/${programme.id}/edit`}
        className="text-sm text-ink-muted hover:text-ink"
      >
        ← Back to {programme.title}
      </Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-h2 text-green-ink">
          Edit specialization
        </h1>
        {/* The specialization has no publish flag of its own — its page is live
            exactly when the PARENT programme is published, which is what the
            two-level RLS check enforces. So the view link is offered on the
            parent's state, not on one of its own. */}
        {programme.is_published && (
          <Link
            href={`/programmes/${programme.slug}/${specialization.slug}`}
            className="text-sm text-green-brand hover:underline"
          >
            View on the site →
          </Link>
        )}
      </div>

      <div className="mt-8">
        <SpecializationForm
          action={action}
          programmeId={programme.id}
          programmeSlug={programme.slug}
          cloudName={cloudName}
          initial={{
            title: specialization.title,
            slug: specialization.slug,
            description: specialization.description,
            body: specialization.body,
            image: specialization.image,
          }}
        />
      </div>

      <hr className="mt-12 border-line" />

      <div className="mt-12">
        <SpecializationFacultySection
          specializationId={specialization.id}
          faculty={faculty}
          cloudName={cloudName}
        />
      </div>
    </main>
  );
}
