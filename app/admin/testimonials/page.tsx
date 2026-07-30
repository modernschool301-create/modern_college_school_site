import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  TestimonialList,
  type AdminTestimonialRow,
} from '@/components/admin/testimonials/testimonial-list';

// Admin-only (the /admin layout enforces the live active-admin check). The admin
// RLS policy returns ALL testimonials here, drafts included.
export default async function AdminTestimonialsPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from('testimonials')
    .select(
      'id, student_name, programme, quote, photo, display_order, is_published, created_at',
    )
    .order('display_order', { ascending: true });

  const testimonials = (data ?? []) as AdminTestimonialRow[];
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? '';

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-h2 text-green-ink">Testimonials</h1>
        <Link href="/admin/testimonials/new" className="btn-primary text-sm">
          New testimonial
        </Link>
      </div>

      <p className="mt-2 text-sm text-ink-muted">
        The Student&rsquo;s Voice page lists published testimonials in this order.
      </p>

      <div className="mt-8">
        <TestimonialList testimonials={testimonials} cloudName={cloudName} />
      </div>
    </main>
  );
}
