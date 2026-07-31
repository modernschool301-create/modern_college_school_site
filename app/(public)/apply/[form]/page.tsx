import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Band } from '@/components/band';
import { Reveal } from '@/components/reveal';
import { NPT_DATE } from '@/lib/dates';
import {
  ADMISSION_FORM_LABELS,
  formRequiresStream,
  isAdmissionFormId,
  type AdmissionForm,
  type ManagementStream,
} from '@/lib/admission-schemas';
import { ApplyForm } from './apply-form';

// The applicant-facing admission form (PRD 21.1). Route is limited to the three
// fixed ids; anything else is not found.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ form: string }>;
}): Promise<Metadata> {
  const { form } = await params;
  if (!isAdmissionFormId(form)) {
    return { title: 'Apply' };
  }
  // From the CODE label, not a database read: metadata should not cost a second
  // query, and the label is stable while the admin-editable title is not.
  const label = ADMISSION_FORM_LABELS[form];
  return {
    title: `Apply — ${label}`,
    description: `Apply for the ${label} programme at Modern College & School, Bhaktapur.`,
    // No Open Graph block, unlike the content pages: an admission form is a
    // transactional page someone is sent to, not a link anyone shares as a
    // card. /admissions is the shareable page and carries the full card.
  };
}

// A shared shell so every state on this route (open, closed, opening soon)
// carries the same page furniture.
function ApplyShell({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Band tone="paper">
      <Reveal>
        <p className="text-eyebrow uppercase tracking-wide text-green-brand">
          {eyebrow}
        </p>
        <h1 className="mt-2 max-w-3xl font-display text-h1 text-green-ink">{title}</h1>
      </Reveal>
      {children}
    </Band>
  );
}

export default async function ApplyFormPage({
  params,
}: {
  params: Promise<{ form: string }>;
}) {
  const { form: formParam } = await params;

  // Only the three fixed ids resolve (PRD 21.1.1).
  if (!isAdmissionFormId(formParam)) {
    notFound();
  }
  const formId = formParam;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('admission_forms')
    .select('id, title, description, is_published, deadline, display_order')
    .eq('id', formId)
    .maybeSingle();

  if (error) {
    console.error('admission form read failed:', error.message);
  }

  const form = data as AdmissionForm | null;

  if (!form) {
    notFound();
  }

  // AN UNPUBLISHED FORM DOES NOT ACCEPT SUBMISSIONS.
  //
  // Anon RLS already hides a draft, so for a visitor `form` would be null above
  // and this branch never runs. It exists for the one reader RLS lets through:
  // a signed-in ACTIVE ADMIN, who can read drafts and would otherwise be handed
  // a live, submittable form for an intake that is not open. A clear closed
  // state rather than notFound(), because someone following an old link
  // deserves to be told the intake closed and where to look next — and because
  // it doubles as the admin's preview of what "unpublished" means. The server
  // action re-checks is_published regardless; this is the courtesy, not the gate.
  if (!form.is_published) {
    return (
      <ApplyShell eyebrow="Admissions" title={form.title}>
        <Reveal className="mt-10 max-w-2xl rounded-lg border border-line bg-surface p-8 sm:p-10">
          <p className="font-display text-h3 text-green-ink">
            This form is not open at the moment
          </p>
          <p className="mt-3 text-ink-muted">
            Applications for this programme are not being accepted right now. The
            admissions page lists every intake that is currently open.
          </p>
          <Link href="/admissions" className="btn-secondary mt-6 text-sm">
            See open admissions
          </Link>
        </Reveal>
      </ApplyShell>
    );
  }

  // The stream picker's options (Decision 5). Only the Management form reads
  // this table; RLS returns available streams only, and the explicit filter
  // keeps the query honest for an admin session that could see retired ones.
  let streams: ManagementStream[] = [];
  if (formRequiresStream(formId)) {
    const { data: streamData, error: streamError } = await supabase
      .from('management_streams')
      .select('id, name')
      .eq('is_available', true)
      .order('display_order', { ascending: true });

    if (streamError) {
      console.error('management streams read failed:', streamError.message);
    }
    streams = (streamData ?? []) as ManagementStream[];
  }

  // THE EMPTY-STREAM GUARD (Decision 5, PRD 21.1.2). The stream list ships
  // empty, so "published Management form, no available streams" is the LAUNCH
  // state, not an edge case — and it is also what the school lands in every
  // time it retires the last stream. Rendering an empty picker would ask an
  // applicant to choose from nothing and then refuse their form. Show an
  // opening-soon state instead, and do not render the form at all.
  const managementHasNoStreams = formRequiresStream(formId) && streams.length === 0;

  if (managementHasNoStreams) {
    return (
      <ApplyShell eyebrow="Admissions" title={form.title}>
        <Reveal className="mt-10 max-w-2xl rounded-lg border border-line bg-surface p-8 sm:p-10">
          <p className="font-display text-h3 text-green-ink">
            Admissions opening soon
          </p>
          <p className="mt-3 text-ink-muted">
            We are finalising the streams on offer for this intake. Applications
            open as soon as that list is confirmed — please check back shortly, or
            contact the admissions office and we will let you know.
          </p>
          <Link href="/contact" className="btn-secondary mt-6 text-sm">
            Contact the office
          </Link>
        </Reveal>
      </ApplyShell>
    );
  }

  return (
    <ApplyShell eyebrow="Admissions" title={form.title}>
      {form.description && (
        <Reveal>
          <p className="measure mt-4 text-lead text-ink-muted">{form.description}</p>
        </Reveal>
      )}

      {/* The deadline is INFORMATIONAL and says so (PRD 8.3). Nothing rejects a
          late submission — a lead after the date is still a lead, and the office
          decides, not the form. */}
      {form.deadline && (
        <Reveal className="mt-6">
          <p className="inline-flex items-center gap-2 rounded-full bg-green-mist px-4 py-2 text-small text-green-ink">
            <span className="font-medium">
              Applications close {NPT_DATE.format(new Date(form.deadline))}
            </span>
            <span className="text-ink-muted">
              — for guidance; the office confirms all dates
            </span>
          </p>
        </Reveal>
      )}

      <Reveal>
        <ApplyForm formId={formId} streams={streams} />
      </Reveal>

      <Reveal className="measure mt-10 text-small text-ink-muted">
        <p>
          Applying does not create an account, and nothing you submit here is
          published. Your answers go to the admissions office, who will contact
          you directly.
        </p>
      </Reveal>
    </ApplyShell>
  );
}
