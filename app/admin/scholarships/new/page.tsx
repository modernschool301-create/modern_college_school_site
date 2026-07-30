import Link from 'next/link';
import { ScholarshipForm } from '@/components/admin/scholarships/scholarship-form';
import { createScholarship } from '../actions';

export default function NewScholarshipPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href="/admin/scholarships"
        className="text-sm text-ink-muted hover:text-ink"
      >
        ← Back to Scholarships
      </Link>
      <h1 className="mt-3 font-display text-h2 text-green-ink">New scholarship</h1>

      <div className="mt-8">
        {/* No cloudName prop: this module has no media (PRD 8.2). */}
        <ScholarshipForm action={createScholarship} />
      </div>
    </main>
  );
}
