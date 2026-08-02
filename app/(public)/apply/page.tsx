import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { cloudinaryImage } from '@/lib/cloudinary-url';
import { Band } from '@/components/band';
import { Reveal } from '@/components/reveal';
import { CardGrid } from '@/components/card-grid';
import { ContentCard } from '@/components/content-card';
import { NPT_DATE } from '@/lib/dates';
import type { AdmissionForm } from '@/lib/admission-schemas';

// The single "which intake is open, click to apply" destination — the nav's
// Apply now button points here. Deliberately ONE section and nothing else: no
// procedure copy, no marketing. /admissions explains how admission works; this
// page only answers "what can I apply for right now?".

const TITLE = 'Apply';
const DESCRIPTION =
  'The intakes currently open at Modern College & School, Bhaktapur — choose a programme and apply online.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    images: cloudinaryImage(
      process.env.CLOUDINARY_CLOUD_NAME ?? '',
      'modern/logo1',
      'c_pad,b_white,w_1200,h_630',
    ),
  },
};

export default async function ApplyPage() {
  const supabase = await createClient();

  // One read of published admission_forms (PRD 15). RLS returns published rows
  // only to the public; the admin-controlled display_order decides the sequence.
  const { data, error } = await supabase
    .from('admission_forms')
    .select('id, title, description, is_published, deadline, display_order')
    .eq('is_published', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('admission forms read failed:', error.message);
  }

  const forms = (data ?? []) as AdmissionForm[];

  return (
    <Band tone="mist">
      <Reveal>
        {/* The page's ONLY h1 — this heading was an h2 while it shared
            /admissions with the page header; standing alone it is the page
            title. Wording still tracks the state: "Apply now" invites an
            action that exists, "Applying" does not promise one that doesn't. */}
        <h1 className="font-display text-h1 text-green-ink">
          {forms.length === 0 ? 'Applying' : 'Apply now'}
        </h1>
      </Reveal>

      {forms.length === 0 ? (
        // No published form. A clear, honest closed state (PRD 15) — never an
        // empty grid, and never a link to a form that will refuse the
        // submission when it arrives.
        <Reveal className="mt-8 rounded-md border border-line bg-surface p-10 text-center">
          <p className="font-display text-h3 text-green-ink">
            Admissions are not currently open
          </p>
          <p className="mx-auto mt-3 max-w-md text-ink-muted">
            There is no intake accepting applications at the moment. Contact the
            admissions office and we will tell you when the next one opens.
          </p>
          <Link href="/contact" className="btn-secondary mt-6 text-sm">
            Contact the office
          </Link>
        </Reveal>
      ) : (
        <Reveal className="mt-8">
          <CardGrid variant="media">
            {forms.map((form) => (
              <ContentCard
                key={form.id}
                // `media` omitted: an admission form has no image of its own
                // and a filler photo here would say nothing. The card is text.
                href={`/apply/${form.id}`}
                meta={
                  form.deadline ? (
                    <p className="text-eyebrow uppercase tracking-wide text-green-brand">
                      {/* Informational, exactly as on the form itself — the
                          date is guidance, not a gate. */}
                      Closes {NPT_DATE.format(new Date(form.deadline))}
                    </p>
                  ) : undefined
                }
                title={form.title}
                body={
                  form.description ? (
                    <p className="text-small text-ink-muted">{form.description}</p>
                  ) : undefined
                }
                footer={
                  <span className="text-small font-medium text-green-brand">
                    Apply for {form.title} →
                  </span>
                }
              />
            ))}
          </CardGrid>
        </Reveal>
      )}
    </Band>
  );
}
