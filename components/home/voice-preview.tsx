import Link from 'next/link';
import { Band } from '@/components/band';
import { Reveal } from '@/components/reveal';
import { createClient } from '@/lib/supabase/server';
import { cloudinaryImage } from '@/lib/cloudinary-url';
import type { Testimonial } from '@/lib/testimonials';

type PreviewTestimonial = Pick<
  Testimonial,
  'id' | 'student_name' | 'programme' | 'quote' | 'photo'
>;

// Real content, given real prominence here (position #3): student voices carry
// more weight than feature lists. Same query and photo treatment as
// /students-voice — this is the two-up preview OF that page, so the first two
// cards here must be the first two cards there. Revalidated by the Testimonials
// admin actions (they revalidate '/'), so publishing refreshes this.
export async function VoicePreview() {
  const supabase = await createClient();
  const cloud = process.env.CLOUDINARY_CLOUD_NAME ?? '';

  // One read (PRD 18). RLS returns only published rows to the public; the
  // editor-controlled display_order decides which two lead.
  const { data } = await supabase
    .from('testimonials')
    .select('id, student_name, programme, quote, photo')
    .eq('is_published', true)
    .order('display_order', { ascending: true });

  const testimonials = ((data ?? []) as PreviewTestimonial[]).slice(0, 2);

  // Nothing published yet → don't show an empty section (same as Leadership and
  // NewsTeaser). The full page keeps its own "stories on their way" state; the
  // homepage simply omits the band.
  if (testimonials.length === 0) return null;

  return (
    // paper, not mist: it now follows ProgrammesOverview (mist) and precedes
    // NewsTeaser (forest).
    <Band tone="paper">
      <Reveal className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-eyebrow uppercase tracking-wide text-green-brand">
            Student&apos;s voice
          </p>
          <h2 className="mt-2 max-w-2xl font-display text-h2 text-green-ink">
            The people who know us best
          </h2>
        </div>
        <Link
          href="/students-voice"
          className="text-small font-medium text-green-brand hover:underline"
        >
          View all voices →
        </Link>
      </Reveal>

      {/* Two-up, but only when there ARE two. With a single published
          testimonial the grid would leave a visibly empty half-row, so it
          collapses to one centred card at the same column width. */}
      <div
        className={
          testimonials.length === 1
            ? 'mt-10 grid gap-6 md:mx-auto md:max-w-[calc(50%-0.75rem)]'
            : 'mt-10 grid gap-6 md:grid-cols-2'
        }
      >
        {testimonials.map((t) => {
          // Identical transform to /students-voice: a face-aware square crop at
          // 200w, which covers the 48px circle on 2× screens.
          const avatar = t.photo
            ? cloudinaryImage(cloud, t.photo, 'c_fill,g_face,ar_1:1,w_200')
            : '';
          return (
            <figure
              key={t.id}
              className="flex flex-col rounded-lg border border-line bg-surface p-8"
            >
              <blockquote className="flex-1 text-lead text-green-ink">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-4">
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatar}
                    alt={`Photo of ${t.student_name}`}
                    loading="lazy"
                    className="h-16 w-16 shrink-0 rounded-full border border-line object-cover"
                  />
                ) : (
                  // No photo → the initial-letter circle. It is decorative
                  // (aria-hidden) and lives ONLY inside this circle, so it never
                  // bleeds into the name text beside it.
                  <span
                    aria-hidden="true"
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-green-pale font-display text-2xl font-semibold text-green-brand"
                  >
                    {t.student_name.charAt(0)}
                  </span>
                )}
                {/* Name and programme on their own lines, clearly spaced. */}
                <div className="flex min-w-0 flex-col">
                  <span className="font-medium leading-tight text-green-ink">
                    {t.student_name}
                  </span>
                  {t.programme && (
                    <span className="mt-1 text-small leading-tight text-ink-muted">
                      {t.programme}
                    </span>
                  )}
                </div>
              </figcaption>
            </figure>
          );
        })}
      </div>
    </Band>
  );
}
