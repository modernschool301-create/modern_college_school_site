import Link from 'next/link';
import { ProgrammeForm } from '@/components/admin/programmes/programme-form';
import { createProgramme } from '../actions';

// Creating a programme is rare — the institution's offering changes seldom — but
// the screen still has to exist: a new +2 stream or a new Bachelor's course must
// not require a developer, which is the whole premise of an admin-managed site.
export default function NewProgrammePage() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? '';

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href="/admin/programmes"
        className="text-sm text-ink-muted hover:text-ink"
      >
        ← Back to Programmes
      </Link>
      <h1 className="mt-3 font-display text-h2 text-green-ink">New programme</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Save the programme first, then add its faculty on the next screen.
      </p>

      <div className="mt-8">
        <ProgrammeForm
          action={createProgramme}
          cloudName={cloudName}
          submitLabel="Save and add faculty"
        />
      </div>
    </main>
  );
}
