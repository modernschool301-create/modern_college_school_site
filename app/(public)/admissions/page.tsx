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

const TITLE = 'Admissions';
const DESCRIPTION =
  'How to apply to Modern College & School, Bhaktapur — the admission procedure and the intakes currently open.';

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

export default async function AdmissionsPage() {
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
    <>
      <Band tone="paper">
        <Reveal>
          <p className="text-eyebrow uppercase tracking-wide text-green-brand">
            Join us
          </p>
          <h1 className="mt-2 max-w-3xl font-display text-h1 text-green-ink">
            {TITLE}
          </h1>
          <p className="measure mt-4 text-lead text-ink-muted">
            Applying takes a few minutes and creates no account. Tell us about
            yourself, and the admissions office will contact you about the next
            steps.
          </p>
        </Reveal>

        {/* ── THE PROCEDURE PROSE IS STILL A STUB ────────────────────────────
            Static-in-code by Decision 10, and blocked on PRD 33 item 9: the
            school owes us the real admission procedure copy (documents to
            bring, fees, entrance test, timeline). What is below is a truthful
            outline of what the system itself does, deliberately NOT invented
            institutional detail — a made-up document checklist on an admissions
            page is the kind of wrong that costs an applicant a wasted trip.
            Replace this block wholesale when the copy arrives. ─────────────── */}
        <Reveal className="mt-12 max-w-3xl">
          <h2 className="font-display text-h2 text-green-ink">How admission works</h2>
          <ol className="mt-6 space-y-5">
            <li className="border-l-2 border-green-pale pl-5">
              <p className="font-medium text-green-ink">Submit the form</p>
              <p className="mt-1 text-ink-muted">
                Choose the programme you want below and fill in the application.
                You will be given a reference number as soon as it is received.
              </p>
            </li>
            <li className="border-l-2 border-green-pale pl-5">
              <p className="font-medium text-green-ink">
                The office gets in touch
              </p>
              <p className="mt-1 text-ink-muted">
                Our admissions team reviews your application and contacts you on
                the phone number or email you gave us. Quote your reference
                number if you call us first.
              </p>
            </li>
            <li className="border-l-2 border-green-pale pl-5">
              <p className="font-medium text-green-ink">Complete your admission</p>
              <p className="mt-1 text-ink-muted">
                The office will confirm what to bring, the fees, and the dates.
                Full details of the procedure are being finalised and will be
                published here shortly.
              </p>
            </li>
          </ol>
        </Reveal>
      </Band>

      <Band tone="mist">
        <Reveal>
          <h2 className="font-display text-h2 text-green-ink">
            {forms.length === 0 ? 'Applying' : 'Apply now'}
          </h2>
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
              There is no intake accepting applications at the moment. Contact
              the admissions office and we will tell you when the next one opens.
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
    </>
  );
}
