'use server';

import { headers } from 'next/headers';
import { Resend } from 'resend';
import { createServiceClient } from '@/lib/supabase/service';
import { clientIpFromHeaders, evaluateSubmission } from '@/lib/bot-protection';
import { getOfficeNotificationEmail } from '@/lib/settings';

export type ContactState = { ok: boolean; error: string | null };

// Shown for hard bot rejects and unexpected failures — never explains the bot
// logic to the submitter (CLAUDE.md / PRD 22).
const GENERIC_ERROR = 'Something went wrong. Please try again.';

// Permissive email shape check — enough to catch a typo, never strict enough
// to block a real submitter over formatting (PRD 34: never lose a lead).
function looksLikeEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function submitContactMessage(
  _prevState: ContactState,
  formData: FormData,
): Promise<ContactState> {
  // 1. Bot checks FIRST, before any write (PRD 9.4, 10.4).
  const requestHeaders = await headers();
  const verdict = evaluateSubmission({
    honeypot: formData.get('company'), // decoy field; real users never see it
    renderedAt: formData.get('rendered_at'),
    ip: clientIpFromHeaders(requestHeaders),
  });

  // Hard bot signal (filled honeypot or clearly-too-fast): write nothing.
  if (verdict.outcome === 'reject') {
    return { ok: false, error: GENERIC_ERROR };
  }
  // Otherwise verdict.verification is 'verified' or (fail-open) 'unverified_review'.

  // 2. Server-side validation.
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const message = String(formData.get('message') ?? '').trim();

  if (!name || !email || !message) {
    return { ok: false, error: 'Please fill in your name, email, and message.' };
  }
  if (!looksLikeEmail(email)) {
    return { ok: false, error: 'Please enter a valid email address.' };
  }
  // Reasonable upper bounds to keep obvious abuse out of the table.
  if (name.length > 200 || email.length > 320 || message.length > 5000) {
    return { ok: false, error: GENERIC_ERROR };
  }

  // 3. Write ONE row via the SERVICE client (bypasses RLS; server-only). The
  //    browser never writes. status/verification/timestamps are set here, never
  //    accepted from the browser (PRD 9.4). status defaults to 'new' and the
  //    timestamps default in the DB.
  const supabase = createServiceClient();
  const { error: insertError } = await supabase.from('contact_messages').insert({
    name,
    email,
    message,
    verification: verdict.verification,
  });

  if (insertError) {
    // Never log the message body or PII — just the failure.
    console.error('contact_messages insert failed:', insertError.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  // 4. Notify the office. The DB row is the source of truth: a mail failure
  //    must NOT lose the lead, so notifyOffice swallows its own errors and we
  //    still report success (PRD 31.3 warns a silent notification failure is
  //    the costliest failure — so we log loudly but never fail the submission).
  await notifyOffice({ name, email, message, verification: verdict.verification });

  return { ok: true, error: null };
}

async function notifyOffice(msg: {
  name: string;
  email: string;
  message: string;
  verification: 'verified' | 'unverified_review';
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  // The Settings page's address when one is configured, otherwise
  // OFFICE_NOTIFICATION_EMAIL — so the office can redirect its mail without a
  // redeploy, while a blank or unreadable setting still lands where it always
  // did. Never fails to nothing (PRD 31.3: a silent notification failure is the
  // costliest failure in the system).
  const to = await getOfficeNotificationEmail();

  if (!apiKey || !from || !to) {
    console.error(
      'Contact notification skipped: missing RESEND_API_KEY, RESEND_FROM, or an office notification address (Settings, or OFFICE_NOTIFICATION_EMAIL).',
    );
    return;
  }

  try {
    const resend = new Resend(apiKey);
    const flag =
      msg.verification === 'unverified_review' ? ' [unverified_review]' : '';
    const { error } = await resend.emails.send({
      from,
      to,
      replyTo: msg.email,
      subject: `New contact message from ${msg.name}${flag}`,
      text:
        `Name: ${msg.name}\n` +
        `Email: ${msg.email}\n` +
        `Verification: ${msg.verification}\n\n` +
        `${msg.message}\n`,
    });
    if (error) {
      console.error('Contact notification email failed:', error);
    }
  } catch (err) {
    console.error('Contact notification email threw:', err);
  }
}
