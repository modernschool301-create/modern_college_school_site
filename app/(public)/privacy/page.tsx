import type { Metadata } from 'next';
import Link from 'next/link';
import { cloudinaryImage } from '@/lib/cloudinary-url';
import { SCHOOL_CONTACT } from '@/lib/contact-details';
import { Band } from '@/components/band';
import { Reveal } from '@/components/reveal';

// Static prose by Decision 10, built to PRD 24. Every statement below describes
// something this build actually does — what the two public forms store, that
// only staff can read it, that none of it is published, and how to have it
// corrected or removed. Deliberately says NOTHING about cookies, analytics, or
// third-party tracking: the site sets none, and a privacy page that claims a
// practice it does not have is the one kind of inaccuracy that matters here.
// If tracking is ever added, this page is amended in the same change.

const TITLE = 'Privacy';
const DESCRIPTION =
  'What Modern College & School stores when you write to us or apply, who can see it, and how to have it corrected or removed.';

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

export default function PrivacyPage() {
  return (
    <Band tone="paper">
      <Reveal>
        <p className="text-eyebrow uppercase tracking-wide text-green-brand">
          Your information
        </p>
        <h1 className="mt-2 max-w-3xl font-display text-h1 text-green-ink">
          Privacy
        </h1>
        <p className="measure mt-4 text-lead text-ink-muted">
          You can read every page on this website without telling us anything
          about yourself. If you choose to apply or send us a message, this page
          explains what we keep, who sees it, and how to have it changed or
          deleted.
        </p>
      </Reveal>

      <Reveal className="rich-text measure mt-12">
        <h2>What this site stores</h2>
        <p>
          There are only two ways information reaches us through this website,
          and both of them are forms you fill in yourself:
        </p>
        <ul>
          <li>
            <strong>Admission enquiries.</strong> When you send an application
            form, we keep what you entered — your name, your email address and
            phone number, your date of birth, your guardian&rsquo;s name and
            phone number, your address, and your previous school and results —
            along with the programme you applied for and the date you applied.
            We use it to contact you about your application and to prepare your
            admission.
          </li>
          <li>
            <strong>Contact messages.</strong> When you use the contact form, we
            keep your name, your email address, and your message, so that we can
            reply.
          </li>
        </ul>
        <p>
          Nothing else about your visit is recorded. Browsing the site, reading a
          news post, or downloading a form stores nothing about you. When you do
          send a form, an automatic check runs first to catch spam; it looks at
          the network address the form came from to spot floods, holds it for a
          few minutes only, and never saves it alongside your message.
        </p>

        <h2>Who can see it</h2>
        <p>
          Only school staff. Applications and messages go straight into a private
          admin area that requires a staff account to open, and staff accounts are
          created only by the school. Nobody else can read what you sent — not
          other visitors, not other applicants.
        </p>
        <p>
          There are no public accounts on this website. You are never asked to
          register, sign up, or create a password, and applying does not create an
          account for you.
        </p>

        <h2>Nothing you send is published</h2>
        <p>
          Applications and contact messages are never shown anywhere on this
          website, in any form. Everything you see published here — news, photos,
          achievements, student comments — is chosen and posted by staff, and a
          student comment appears only where it has been given to us for that
          purpose.
        </p>

        <h2>Photographs and documents</h2>
        <p>
          Photographs and other media published on this site are stored with
          Cloudinary, our media host, and are public in the same way the pages
          they appear on are public.
        </p>
        <p>
          The application form does not ask you to upload any documents. If you
          need to give us a certificate, a transcript, or a photograph, the
          admissions office will tell you how when they contact you — please do
          not send personal documents through the contact form.
        </p>

        <h2>Correcting or removing your information</h2>
        <p>
          You can ask us at any time to correct something you sent, or to have it
          removed. Call or write to us using the details below, tell us your
          name and roughly when you contacted us, and say what you would like
          changed or removed. If you applied, quoting the reference number shown
          when you submitted the form is the fastest way for us to find you.
        </p>
        <p>
          We will act on the request and confirm back to you. Where we still need
          to keep something — for example, an application that has already become
          an enrolment record — we will tell you that plainly rather than quietly
          leaving it in place.
        </p>

        <h2>How to reach us</h2>
        <address className="not-italic">
          {SCHOOL_CONTACT.address}
          <br />
          {SCHOOL_CONTACT.phones.map((phone, i) => (
            <span key={phone.dial}>
              {i > 0 && ', '}
              <a href={`tel:${phone.dial}`}>{phone.display}</a>
            </span>
          ))}
          <br />
          {SCHOOL_CONTACT.emails.map((email, i) => (
            <span key={email}>
              {i > 0 && ', '}
              <a href={`mailto:${email}`}>{email}</a>
            </span>
          ))}
        </address>
        <p>
          You can also use the <Link href="/contact">contact form</Link> — it
          reaches the same office.
        </p>
      </Reveal>
    </Band>
  );
}
