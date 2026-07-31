// ============================================================================
// Admission form field schemas — FIXED IN CODE, per form id (Decision 4).
//
// There is no form builder, deliberately: dynamic form definition is high-effort,
// high-risk flexibility the school does not need, and it would put the shape of
// a legal admission record in an editable row. What the admin owns is the form's
// WORDS (title, description, deadline) and whether it is open. What the code
// owns is which questions it asks.
//
// ┌─ ONE SCHEMA, TWO READERS ─────────────────────────────────────────────────┐
// │ This module is imported by BOTH the page renderer (apply-form.tsx, a      │
// │ client component) and the server validator (apply/[form]/actions.ts). It  │
// │ is the reason they cannot drift: a field added here is rendered AND       │
// │ validated, and a field removed here disappears from both. Adding a field  │
// │ to one side only is not possible without editing this file.               │
// │                                                                           │
// │ Consequently: NO `server-only` import, and nothing secret in here. It is  │
// │ pure data that ships to the browser, which is correct — these are the     │
// │ questions on a public form.                                               │
// └───────────────────────────────────────────────────────────────────────────┘
// ============================================================================

// The three fixed ids (PRD 8.3). These are the primary keys of admission_forms,
// the last segment of /apply/[form], and the keys of every map below.
export const ADMISSION_FORM_IDS = [
  'plus_two_management',
  'plus_two_law',
  'bbs',
] as const;

export type AdmissionFormId = (typeof ADMISSION_FORM_IDS)[number];

export function isAdmissionFormId(value: string): value is AdmissionFormId {
  return (ADMISSION_FORM_IDS as readonly string[]).includes(value);
}

// Short display labels. These live HERE and not in the database so the stored
// id stays stable while the presentation can change without a migration — the
// same call lib/programmes.ts makes for PROGRAMME_LEVEL_LABELS. Used by the
// admin filter, the reference legend, and page metadata; the PUBLIC page shows
// the admin's editable `title` from the row instead, never this.
export const ADMISSION_FORM_LABELS: Record<AdmissionFormId, string> = {
  plus_two_management: '+2 Management',
  plus_two_law: '+2 Law',
  bbs: 'BBS',
};

// The reference prefix per form, for display only (the legend on the admin
// list). The AUTHORITATIVE copy lives in the database, inside
// next_admission_reference() — a reference is allocated by the counter and
// never assembled in application code. Keep the two in step.
export const ADMISSION_REFERENCE_PREFIXES: Record<AdmissionFormId, string> = {
  plus_two_management: 'MGMT',
  plus_two_law: 'LAW',
  bbs: 'BBS',
};

// The one form that asks which stream (Decision 5). Named rather than compared
// inline so every "is this the Management form?" test reads the same.
export const MANAGEMENT_FORM_ID: AdmissionFormId = 'plus_two_management';

export function formRequiresStream(formId: AdmissionFormId): boolean {
  return formId === MANAGEMENT_FORM_ID;
}

// ---------------------------------------------------------------------------
// Field definitions
// ---------------------------------------------------------------------------

export type AdmissionFieldType = 'text' | 'email' | 'tel' | 'date' | 'select' | 'textarea';

export type AdmissionField = {
  // The form-data key, and (for payload fields) the jsonb key it is stored under.
  name: string;
  label: string;
  type: AdmissionFieldType;
  // Fixed options for a 'select'. A dynamic list (the Management streams) is
  // NOT modelled here — it is data, not schema, and is handled separately.
  options?: readonly string[];
  // Generous upper bounds. These exist to keep obvious abuse out of the table,
  // NOT to police an applicant's formatting (PRD 21.1) — every one of them is
  // far larger than a real answer.
  maxLength: number;
  autoComplete?: string;
  hint?: string;
};

export const GENDER_OPTIONS = ['Male', 'Female', 'Other'] as const;

// Answers promoted to their own COLUMNS on admission_submissions, for a readable
// admin pipeline (PRD 8.3). Everything else goes to `payload`. `stream` is a
// column too but is not in the field list — it is dynamic (see below).
export const ADMISSION_COLUMN_FIELDS = ['full_name', 'email', 'phone'] as const;

// Asked by all three forms, in this order.
export const ADMISSION_BASELINE_FIELDS: readonly AdmissionField[] = [
  {
    name: 'full_name',
    label: 'Full name',
    type: 'text',
    maxLength: 200,
    autoComplete: 'name',
  },
  {
    name: 'email',
    label: 'Email',
    type: 'email',
    maxLength: 320,
    autoComplete: 'email',
  },
  {
    name: 'phone',
    label: 'Phone',
    type: 'tel',
    maxLength: 40,
    autoComplete: 'tel',
    hint: 'A number the admissions office can reach you on.',
  },
  {
    name: 'date_of_birth',
    label: 'Date of birth',
    type: 'date',
    maxLength: 20,
    autoComplete: 'bday',
  },
  {
    name: 'gender',
    label: 'Gender',
    type: 'select',
    options: GENDER_OPTIONS,
    maxLength: 20,
  },
  {
    name: 'guardian_name',
    label: 'Guardian name',
    type: 'text',
    maxLength: 200,
  },
  {
    name: 'guardian_phone',
    label: 'Guardian phone',
    type: 'tel',
    maxLength: 40,
  },
  {
    // A single free-text field, NOT a province/district/municipality cascade.
    // Three linked selects would be three chances to stall an applicant on a
    // form whose entire purpose is to capture a lead the office then phones.
    name: 'permanent_address',
    label: 'Permanent address',
    type: 'textarea',
    maxLength: 500,
    autoComplete: 'street-address',
  },
];

// The +2 academic pair: what an applicant leaving school has.
const SEE_RESULT_FIELDS: readonly AdmissionField[] = [
  {
    name: 'see_gpa',
    label: 'SEE GPA',
    type: 'text',
    maxLength: 20,
    // TEXT and unvalidated on purpose. An applicant may type '3.65', 'GPA 3.65',
    // 'awaited', or 'result pending' — every one of those is a usable lead, and
    // a numeric field that rejects 'awaited' turns a real applicant away over a
    // formatting quibble (PRD 21.1, 34).
    hint: 'Your SEE grade point average. If your result is still awaited, say so.',
  },
  {
    name: 'previous_school',
    label: 'Previous school',
    type: 'text',
    maxLength: 200,
  },
];

// The Bachelor pair: what an applicant leaving +2 has.
const PLUS_TWO_RESULT_FIELDS: readonly AdmissionField[] = [
  {
    name: 'plus_two_gpa',
    label: '+2 GPA',
    type: 'text',
    maxLength: 20,
    hint: 'Your +2 grade point average. If your result is still awaited, say so.',
  },
  {
    // FREE TEXT, not a picker. This is the stream the applicant studied
    // ELSEWHERE, at whatever college they came from — it has nothing to do with
    // management_streams, which is this college's own +2 Management offering.
    // A picker here would force another institution's programme into our list.
    name: 'plus_two_stream',
    label: '+2 stream',
    type: 'text',
    maxLength: 120,
    hint: 'For example Management, Science, Humanities, or Law.',
  },
];

// The extra fields each form asks beyond the baseline, in render order. For
// Management the stream picker sits between the baseline and these (see
// apply-form.tsx) because "which stream?" is the first academic question.
export const ADMISSION_EXTRA_FIELDS: Record<
  AdmissionFormId,
  readonly AdmissionField[]
> = {
  // ┌─ WHY LAW IS NOT MERGED INTO MANAGEMENT ─────────────────────────────────┐
  // │ Law's field list below is IDENTICAL to Management's minus the stream    │
  // │ picker. That is deliberate, and it will keep looking like duplication   │
  // │ to whoever reads this next. Do not merge them into one form with an     │
  // │ optional stream.                                                        │
  // │                                                                         │
  // │ Decision 4 justified separate forms on two grounds: different fields    │
  // │ AND independent open/close. Only the second still applies — but it is   │
  // │ the load-bearing one. Law has limited seats and must be able to CLOSE   │
  // │ EARLY while Management stays open. One merged form has one publish      │
  // │ flag, so closing Law would close Management with it, in the middle of   │
  // │ admission season. The duplication is the price of that independence,    │
  // │ and it is cheap: two entries in this map.                               │
  // └─────────────────────────────────────────────────────────────────────────┘
  plus_two_management: SEE_RESULT_FIELDS,
  plus_two_law: SEE_RESULT_FIELDS,
  bbs: PLUS_TWO_RESULT_FIELDS,
};

// The complete ordered field list for a form. What the validator walks.
export function admissionFields(formId: AdmissionFormId): readonly AdmissionField[] {
  return [...ADMISSION_BASELINE_FIELDS, ...ADMISSION_EXTRA_FIELDS[formId]];
}

// The human label for a stored payload key, so the admin detail view shows
// "Date of birth" rather than "date_of_birth". Falls back to the raw key: a
// payload written under an older schema still renders rather than vanishing.
export function admissionFieldLabel(formId: AdmissionFormId, name: string): string {
  return admissionFields(formId).find((f) => f.name === name)?.label ?? name;
}

// ---------------------------------------------------------------------------
// Validation — the server's half of the shared schema
// ---------------------------------------------------------------------------

// Permissive email shape check. IDENTICAL to the contact action's: enough to
// catch a typo, never strict enough to block a real applicant over formatting
// (PRD 21.1, 34 — never lose a lead).
export function looksLikeEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export type AdmissionAnswers =
  | { ok: true; values: Record<string, string> }
  | { ok: false; error: string };

/**
 * Validate a submitted form against its code schema.
 *
 * Every field is required (all three forms ask only for things an applicant
 * has). Beyond required-ness the checks are deliberately thin: a length bound
 * to keep abuse out of the table, an option check on the one fixed select, and
 * the permissive email shape. Phone numbers and GPAs are NOT format-checked —
 * see the hints on those fields for why.
 *
 * Errors name the field in the interface's voice, never "Error:" (design system
 * §10), because the applicant has to be able to fix it.
 */
export function collectAdmissionAnswers(
  formId: AdmissionFormId,
  formData: FormData,
): AdmissionAnswers {
  const values: Record<string, string> = {};

  for (const field of admissionFields(formId)) {
    const value = String(formData.get(field.name) ?? '').trim();

    if (!value) {
      return { ok: false, error: `Please fill in your ${field.label.toLowerCase()}.` };
    }
    if (value.length > field.maxLength) {
      return {
        ok: false,
        error: `That ${field.label.toLowerCase()} is longer than we can store. Please shorten it.`,
      };
    }
    if (field.options && !field.options.includes(value)) {
      return { ok: false, error: `Please choose a ${field.label.toLowerCase()}.` };
    }
    if (field.type === 'email' && !looksLikeEmail(value)) {
      return { ok: false, error: 'Please enter a valid email address.' };
    }

    values[field.name] = value;
  }

  return { ok: true, values };
}

/**
 * Split validated answers into the promoted COLUMNS and the jsonb payload.
 * `stream` is handled by the caller — it is a column, but it comes from the
 * live streams table rather than from the code schema.
 */
export function splitAdmissionAnswers(values: Record<string, string>): {
  full_name: string;
  email: string;
  phone: string;
  payload: Record<string, string>;
} {
  const { full_name, email, phone, ...payload } = values;
  return { full_name, email, phone, payload };
}

// ---------------------------------------------------------------------------
// Shared row types
// ---------------------------------------------------------------------------

export const SUBMISSION_STATUSES = [
  'new',
  'reviewed',
  'contacted',
  'enrolled',
  'archived',
] as const;

export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  new: 'New',
  reviewed: 'Reviewed',
  contacted: 'Contacted',
  enrolled: 'Enrolled',
  archived: 'Archived',
};

export type VerificationState = 'verified' | 'unverified_review';

export type AdmissionForm = {
  id: AdmissionFormId;
  title: string;
  description: string | null;
  is_published: boolean;
  deadline: string | null;
  display_order: number;
};

export type ManagementStream = {
  id: string;
  name: string;
};

export type AdmissionSubmission = {
  id: string;
  reference: string;
  form_id: AdmissionFormId;
  full_name: string;
  email: string;
  phone: string;
  stream: string | null;
  payload: Record<string, string>;
  status: SubmissionStatus;
  verification: VerificationState;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Programme level → admission forms (PRD 14)
// ---------------------------------------------------------------------------

/**
 * Which admission forms belong to a programme LEVEL.
 *
 * Resolved by level and NOT by slug guessing, because a slug is editor-owned
 * free text: a programme renamed 'bbs-morning' would silently lose its Apply
 * link, and the failure would be invisible on a public page. `level` is a fixed
 * enum the code already understands.
 *
 * Note the +2 level maps to TWO forms, and this returns both rather than
 * picking one. A +2 programme page therefore offers every +2 form that is
 * currently open. That is truthful — those really are the +2 admissions open
 * today — and it is the only honest answer available, since nothing in the data
 * model links a programme row to a form id. Guessing (say, sending every +2
 * programme to the Management form because it is the bigger one) would point a
 * Law applicant at the wrong form.
 *
 * 'secondary' maps to NOTHING, and that is a real gap, not an omission here:
 * the three forms cover +2 and Bachelor only, so a school-level programme has
 * no admission form to link to and keeps the generic /admissions link.
 */
export function admissionFormIdsForLevel(
  level: 'secondary' | 'plus_two' | 'bachelor',
): readonly AdmissionFormId[] {
  switch (level) {
    case 'plus_two':
      return ['plus_two_management', 'plus_two_law'];
    case 'bachelor':
      return ['bbs'];
    case 'secondary':
    default:
      return [];
  }
}
