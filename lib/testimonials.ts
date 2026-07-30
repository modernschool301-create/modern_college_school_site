// Shared Testimonials types (reused by admin and public sides), mirroring
// lib/achievements.ts. Date formatting comes from lib/dates.ts — defined once
// there. `programme` is free text (the programmes table is Phase 2); `quote` is
// plain text, rendered verbatim, NOT markdown.

export type Testimonial = {
  id: string;
  student_name: string;
  programme: string | null;
  quote: string;
  photo: string | null; // Cloudinary public ID
  display_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};
