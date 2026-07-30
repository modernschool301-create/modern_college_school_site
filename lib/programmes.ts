// Shared Programmes types + constants (reused by admin and public sides). Two
// related tables: a programme owns its faculty rows, and a faculty row has NO
// published flag of its own — its visibility follows the programme, enforced in
// RLS rather than in any query here (see the migration).
//
// Decision 9 is why faculty is a table at all: faculty turn over yearly and are
// editable rows, while the curriculum/subject tables are relatively stable and
// live as markdown inside `body`.

// The level vocabulary is FIXED (PRD 8.2) and backed by the
// public.programme_level Postgres enum, modelled on post_type and
// download_category. The order here is the order a select offers them, which is
// the institution's own progression.
export const PROGRAMME_LEVELS = ['secondary', 'plus_two', 'bachelor'] as const;
export type ProgrammeLevel = (typeof PROGRAMME_LEVELS)[number];

// Display labels live HERE, not in the database, so the enum value stays stable
// while the presentation can change without a migration. '+2' is the name a
// Nepali student and parent actually recognise — the stored 'plus_two' exists
// only because a Postgres enum value cannot start with '+'.
export const PROGRAMME_LEVEL_LABELS: Record<ProgrammeLevel, string> = {
  secondary: 'Secondary',
  plus_two: '+2',
  bachelor: 'Bachelor',
};

export type Programme = {
  id: string;
  slug: string;
  title: string;
  level: ProgrammeLevel;
  intro: string | null;
  body: string | null;
  cover_image: string | null; // Cloudinary public ID — beyond PRD 8.2, see migration
  display_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type ProgrammeFaculty = {
  id: string;
  programme_id: string;
  name: string;
  qualification: string | null;
  photo: string | null; // Cloudinary public ID
  display_order: number;
  created_at: string;
  updated_at: string;
};

// URL-safe slug from a title, identical in behaviour to the News and Gallery
// ones so the modules cannot drift on what a valid address looks like.
export function slugifyProgramme(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

// The initial shown in the avatar fallback when a faculty member has no
// photograph. Defined here so the admin list and the public roster cannot
// disagree about what a nameless-photo row looks like.
export function facultyInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}
