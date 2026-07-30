import Link from 'next/link';
import { TestimonialForm } from '@/components/admin/testimonials/testimonial-form';
import { createTestimonial } from '../actions';

export default function NewTestimonialPage() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? '';

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href="/admin/testimonials"
        className="text-sm text-ink-muted hover:text-ink"
      >
        ← Back to Testimonials
      </Link>
      <h1 className="mt-3 font-display text-h2 text-green-ink">New testimonial</h1>

      <div className="mt-8">
        <TestimonialForm action={createTestimonial} cloudName={cloudName} />
      </div>
    </main>
  );
}
