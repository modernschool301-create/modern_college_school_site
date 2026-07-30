import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { cloudinaryImage, cloudinaryRawUrl } from '@/lib/cloudinary-url';
import { Band } from '@/components/band';
import { Reveal } from '@/components/reveal';
import {
  DOWNLOAD_CATEGORIES,
  DOWNLOAD_CATEGORY_LABELS,
  type Download,
  type DownloadCategory,
} from '@/lib/downloads';

const TITLE = 'Downloads';
const DESCRIPTION =
  'Results, routines, forms, and notices to download from Modern College & School, Bhaktapur.';

// Open Graph per PRD 10.6 — a shared link renders as an official card. This page
// has no image of its own, so it falls back to the institution logo.
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    images: cloudinaryImage(
      process.env.CLOUDINARY_CLOUD_NAME ?? '',
      'modern/logo1',
      'c_pad,b_white,w_1200,h_630',
    ),
  },
};

type PublicDownload = Pick<
  Download,
  'id' | 'title' | 'description' | 'file' | 'category'
>;

// The file type, from the extension carried in the RAW public ID. Shown as a
// small tag so a visitor knows what they are about to get before they click.
function fileKind(publicId: string): string {
  const ext = publicId.split('.').pop() ?? '';
  return ext && ext !== publicId ? ext.toUpperCase() : 'FILE';
}

function DocumentIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-0.5 h-6 w-6 shrink-0 text-green-brand"
    >
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}

export default async function DownloadsPage() {
  const supabase = await createClient();
  const cloud = process.env.CLOUDINARY_CLOUD_NAME ?? '';

  // One read (PRD 23). RLS returns only published rows to the public; the
  // editor-controlled display_order decides the sequence within each category.
  const { data } = await supabase
    .from('downloads')
    .select('id, title, description, file, category')
    .eq('is_published', true)
    .order('display_order', { ascending: true });

  const downloads = (data ?? []) as PublicDownload[];

  // GROUPED, not filtered (PRD 23 allows either). A downloads page is a short
  // reference list people arrive at looking for one specific thing, so showing
  // every category at once beats chips that hide three-quarters of the page
  // behind a click — and grouping needs no client state, no extra reads, and no
  // URL parameters. It also gives a real heading outline: one <h2> per category
  // under the page <h1>. Category order comes from DOWNLOAD_CATEGORIES, so it is
  // stable rather than dependent on what happens to be published.
  const grouped = DOWNLOAD_CATEGORIES.map((category) => ({
    category,
    items: downloads.filter((d) => d.category === category),
  })).filter((group) => group.items.length > 0);

  return (
    <Band tone="paper">
      <Reveal>
        <p className="text-eyebrow uppercase tracking-wide text-green-brand">
          Resources
        </p>
        <h1 className="mt-2 max-w-2xl font-display text-h1 text-green-ink">
          {TITLE}
        </h1>
        <p className="mt-4 max-w-2xl text-lead text-ink-muted">
          Results, routines, forms, and notices — ready to open or save.
        </p>
      </Reveal>

      {grouped.length === 0 ? (
        <Reveal className="mt-12 rounded-md border border-line bg-surface p-10 text-center">
          <p className="font-display text-h3 text-green-ink">
            No files to download yet
          </p>
          <p className="mx-auto mt-3 max-w-md text-ink-muted">
            Results, routines, and forms will appear here as they are published.
            In the meantime, our news page carries the latest notices.
          </p>
          <Link
            href="/news"
            className="mt-6 inline-block rounded-sm border border-green-brand px-5 py-2.5 text-sm font-medium text-green-brand transition-colors hover:bg-green-mist"
          >
            Read the latest news
          </Link>
        </Reveal>
      ) : (
        <Reveal className="mt-12 space-y-12">
          {grouped.map(({ category, items }) => (
            <section key={category} aria-labelledby={`downloads-${category}`}>
              <h2
                id={`downloads-${category}`}
                className="font-display text-h3 text-green-ink"
              >
                {DOWNLOAD_CATEGORY_LABELS[category as DownloadCategory]}
              </h2>

              {/* A LIST of file links, not a card grid (PRD 23): each row is one
                  document, and a dense list is far easier to scan for a specific
                  filename than a grid of equal-weight cards. */}
              <ul className="mt-4 divide-y divide-line rounded-md border border-line bg-surface">
                {items.map((item) => (
                  <li key={item.id}>
                    <a
                      href={cloudinaryRawUrl(cloud, item.file)}
                      // Raw delivery is byte-exact and untransformed, and
                      // browsers download rather than render it by default,
                      // which is what this page wants. `download` is advisory
                      // only here — browsers ignore it cross-origin — so the
                      // behaviour comes from the raw delivery itself, not from
                      // this attribute. The new tab keeps the visitor on the
                      // page they were browsing.
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 p-5 transition-colors hover:bg-green-mist"
                    >
                      <DocumentIcon />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-baseline gap-x-2">
                          <span className="font-medium text-green-ink">
                            {item.title}
                          </span>
                          <span className="text-xs uppercase tracking-wide text-ink-muted">
                            {fileKind(item.file)}
                          </span>
                        </span>
                        {item.description && (
                          <span className="mt-1 block text-small text-ink-muted">
                            {item.description}
                          </span>
                        )}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </Reveal>
      )}
    </Band>
  );
}
