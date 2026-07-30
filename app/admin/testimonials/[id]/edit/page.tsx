import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TestimonialForm } from '@/components/admin/testimonials/testimonial-form';
import { updateTestimonial } from '../../actions';
import type { Testimonial } from '@/lib/testimonials';

export default async function EditTestimonialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from('testimonials')
    .select('*')
    .eq('id', id)
    .single();

  if (!data) notFound();

  const testimonial = data as Testimonial;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? '';

  // Bind the id so the form's action matches (state, formData) => state.
  const action = updateTestimonial.bind(null, testimonial.id);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href="/admin/testimonials"
        className="text-sm text-ink-muted hover:text-ink"
      >
        ← Back to Testimonials
      </Link>
      <h1 className="mt-3 font-display text-h2 text-green-ink">Edit testimonial</h1>

      <div className="mt-8">
        <TestimonialForm
          action={action}
          cloudName={cloudName}
          initial={{
            student_name: testimonial.student_name,
            programme: testimonial.programme,
            quote: testimonial.quote,
            photo: testimonial.photo,
            is_published: testimonial.is_published,
          }}
        />
      </div>
    </main>
  );
}
