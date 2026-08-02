import type { Metadata } from 'next';
import Link from 'next/link';
import { cloudinaryImage } from '@/lib/cloudinary-url';
import { Band } from '@/components/band';
import { Reveal } from '@/components/reveal';

// Purely informational: how admission works. The list of open intakes lives on
// /apply and ONLY there, so there is one place a visitor is sent to act.

const TITLE = 'Admissions';
const DESCRIPTION =
  'How to apply to Modern College & School, Bhaktapur — the admission procedure, step by step.';

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

export default function AdmissionsPage() {
  return (
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
              Choose the programme you want on the apply page and fill in the
              application. You will be given a reference number as soon as it is
              received.
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

        {/* The way out. Someone who lands here directly (search, a shared link,
            the Admissions▾ dropdown) never sees the nav's Apply button as the
            obvious next step, and this page has no picker of its own — without
            this link the procedure just stops. */}
        <Link
          href="/apply"
          className="mt-8 inline-block text-sm font-medium text-green-brand hover:underline"
        >
          See which admissions are open now →
        </Link>
      </Reveal>
    </Band>
  );
}
