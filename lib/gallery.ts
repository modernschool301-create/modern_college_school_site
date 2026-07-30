// Shared Gallery types (reused by admin and public sides). Two related tables:
// an album owns its photographs, and a photograph has NO published flag of its
// own — its visibility follows the album, enforced in RLS rather than in any
// query here (see the migration).
//
// Date formatting comes from lib/dates.ts. `event_date` is a DATE, not a
// timestamp: the day an event happened, with no time-of-day and so no timezone
// question to answer.

export type GalleryAlbum = {
  id: string;
  slug: string;
  title: string;
  cover_photo: string | null; // Cloudinary public ID
  event_date: string | null; // ISO date (YYYY-MM-DD)
  display_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type GalleryPhoto = {
  id: string;
  album_id: string;
  photo_file: string; // Cloudinary public ID
  caption: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
};

// URL-safe slug from a title, identical in behaviour to the News one so the two
// modules cannot drift on what a valid address looks like.
export function slugifyAlbum(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
