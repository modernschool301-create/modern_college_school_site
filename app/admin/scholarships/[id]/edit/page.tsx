import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ScholarshipForm } from '@/components/admin/scholarships/scholarship-form';
import { updateScholarship } from '../../actions';
import type { Scholarship } from '@/lib/scholarships';

export default async function EditScholarshipPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from('scholarships')
    .select('*')
    .eq('id', id)
    .single();

  if (!data) notFound();

  const scholarship = data as Scholarship;

  // Bind the id so the form's action matches (state, formData) => state.
  const action = updateScholarship.bind(null, scholarship.id);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href="/admin/scholarships"
        className="text-sm text-ink-muted hover:text-ink"
      >
        ← Back to Scholarships
      </Link>
      <h1 className="mt-3 font-display text-h2 text-green-ink">Edit scholarship</h1>

      <div className="mt-8">
        <ScholarshipForm
          action={action}
          initial={{
            title: scholarship.title,
            description: scholarship.description,
            criteria: scholarship.criteria,
            is_published: scholarship.is_published,
          }}
        />
      </div>
    </main>
  );
}
