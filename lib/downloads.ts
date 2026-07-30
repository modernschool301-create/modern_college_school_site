// Shared Downloads module constants + types (reused by admin and public sides),
// mirroring lib/news.ts. The category vocabulary is FIXED (PRD 8.2) and backed
// by the public.download_category Postgres enum — unlike news_categories, which
// is editor-managed data. The order here is the order the public page groups in.

export const DOWNLOAD_CATEGORIES = [
  'result',
  'routine',
  'form',
  'notice',
] as const;
export type DownloadCategory = (typeof DOWNLOAD_CATEGORIES)[number];

export const DOWNLOAD_CATEGORY_LABELS: Record<DownloadCategory, string> = {
  result: 'Results',
  routine: 'Routines',
  form: 'Forms',
  notice: 'Notices',
};

// Singular form, for the badge on a single row in the admin list.
export const DOWNLOAD_CATEGORY_SINGULAR: Record<DownloadCategory, string> = {
  result: 'Result',
  routine: 'Routine',
  form: 'Form',
  notice: 'Notice',
};

export type Download = {
  id: string;
  title: string;
  description: string | null;
  file: string; // Cloudinary public ID — RAW, so it includes the extension
  category: DownloadCategory;
  display_order: number;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};
