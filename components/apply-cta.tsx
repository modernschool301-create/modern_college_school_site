import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Reveal } from '@/components/reveal';
import { admissionFormIdsForLevel, type AdmissionForm } from '@/lib/admission-schemas';
import type { ProgrammeLevel } from '@/lib/programmes';

// The contextual Apply call to action (PRD 14): shown on a programme page, and
// linking to the admission forms actually open for that programme's LEVEL.
//
// ┌─ HOW A PROGRAMME RESOLVES TO A FORM ──────────────────────────────────────┐
// │ By `level`, never by slug. A slug is editor-owned free text — renaming a  │
// │ programme to 'bbs-morning' would silently break a slug-matched Apply link │
// │ on a public page, with nothing to notice it. `level` is a fixed enum.     │
// │                                                                           │
// │ The +2 level maps to TWO forms (Management and Law), and this renders     │
// │ BOTH when both are open rather than picking one. Nothing in the data      │
// │ model links a programme ROW to a form ID, so choosing between them would  │
// │ be a guess — and the wrong guess sends a Law applicant to the Management  │
// │ form. Two buttons is the honest answer: these are the +2 intakes open     │
// │ today. If the school ever wants one programme pinned to one form, that is │
// │ a nullable `admission_form_id` column on programmes, not a heuristic here.│
// │                                                                           │
// │ 'secondary' maps to NO form at all — the three admission forms cover +2   │
// │ and Bachelor only. A school-level programme falls through to the generic  │
// │ /admissions link, which is correct rather than broken: that page carries  │
// │ the procedure and the office's contact details.                           │
// └───────────────────────────────────────────────────────────────────────────┘
export async function ApplyCta({
  level,
  heading,
}: {
  level: ProgrammeLevel;
  heading: string;
}) {
  const formIds = admissionFormIdsForLevel(level);

  let forms: AdmissionForm[] = [];
  if (formIds.length > 0) {
    const supabase = await createClient();
    // RLS returns published rows only to the public; the explicit filter keeps
    // the query honest for an admin session, which can also read drafts.
    const { data, error } = await supabase
      .from('admission_forms')
      .select('id, title, description, is_published, deadline, display_order')
      .in('id', formIds)
      .eq('is_published', true)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('admission forms read failed:', error.message);
    }
    forms = (data ?? []) as AdmissionForm[];
  }

  // Nothing open (or no form at this level): the generic link, unchanged from
  // what this block said before admissions existed. Never link to a form that
  // is closed — it would refuse the submission on arrival.
  if (forms.length === 0) {
    return (
      <Reveal className="mt-16 rounded-lg border border-line bg-green-mist p-8 text-center sm:p-10">
        <p className="font-display text-h3 text-green-ink">{heading}</p>
        <p className="mx-auto mt-3 max-w-lg text-ink-muted">
          The admissions page sets out the procedure, what to bring, and how to
          reach the admissions office.
        </p>
        <Link href="/admissions" className="btn-primary mt-6 text-sm">
          Apply now
        </Link>
      </Reveal>
    );
  }

  return (
    <Reveal className="mt-16 rounded-lg border border-line bg-green-mist p-8 text-center sm:p-10">
      <p className="font-display text-h3 text-green-ink">{heading}</p>
      <p className="mx-auto mt-3 max-w-lg text-ink-muted">
        {forms.length === 1
          ? 'Applications are open. It takes a few minutes and creates no account.'
          : 'These intakes are open now. It takes a few minutes and creates no account.'}
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {forms.map((form, index) => (
          <Link
            key={form.id}
            href={`/apply/${form.id}`}
            // The rationed signature green is spent on ONE primary per view
            // (design_system.md §8), so a second open intake renders as the
            // secondary treatment rather than a second bright button.
            className={index === 0 ? 'btn-primary text-sm' : 'btn-secondary text-sm'}
          >
            Apply for {form.title}
          </Link>
        ))}
      </div>

      <p className="mt-4 text-small text-ink-muted">
        <Link href="/admissions" className="text-green-brand hover:underline">
          Read the admission procedure
        </Link>
      </p>
    </Reveal>
  );
}
