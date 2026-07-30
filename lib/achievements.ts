// Shared Achievements types (reused by admin and public sides), mirroring
// lib/news.ts. Date formatting comes from lib/dates.ts — defined once there.

export type Achievement = {
  id: string;
  title: string;
  description: string | null;
  image: string | null;
  achieved_on: string | null; // `date` column → 'YYYY-MM-DD'
  display_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};
