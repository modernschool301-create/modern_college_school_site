import { ContactForm } from './contact-form';

// Public contact page (PRD 22). Contact details are static prose (Decision 10);
// the "Tell us what you think" form is the first public write path. Styling and
// the full details block (map, socials) land in Phase 1 — kept simple here.
export default function ContactPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Contact us</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Srijananagar, Bhaktapur Municipality-1, Bhaktapur. Have a question or
        feedback? Send us a message below.
      </p>
      <ContactForm />
    </main>
  );
}
