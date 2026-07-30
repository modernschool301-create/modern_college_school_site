// Shared Scholarships types (reused by admin and public sides), mirroring
// lib/testimonials.ts. This module has NO media field (PRD 8.2) and no date of
// its own, so nothing here touches Cloudinary or lib/dates.ts.
//
// `description` and `criteria` are both MARKDOWN, rendered through .rich-text on
// the public page (the same treatment as achievements.description).

export type Scholarship = {
  id: string;
  title: string;
  description: string | null;
  criteria: string | null;
  display_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};
