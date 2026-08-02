// Shared Leadership Messages types (reused by admin and public sides),
// mirroring lib/testimonials.ts.
//
// `title` is FREE TEXT — the school names the role itself, there is no enum.
// `excerpt` is PLAIN TEXT, rendered verbatim on the card. `full_message` is
// MARKDOWN and nullable, and null means something specific: there is no longer
// message, so the public card renders no "Read full message" button at all.

export type LeadershipMessage = {
  id: string;
  name: string;
  title: string;
  photo: string | null; // Cloudinary public ID
  excerpt: string;
  full_message: string | null; // markdown; null → no dialog for this person
  display_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};
