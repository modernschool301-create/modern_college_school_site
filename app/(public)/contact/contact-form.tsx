'use client';

import { useActionState, useEffect, useState } from 'react';
import { submitContactMessage, type ContactState } from './actions';

const initialState: ContactState = { ok: false, error: null };

export function ContactForm() {
  const [state, formAction, pending] = useActionState(
    submitContactMessage,
    initialState,
  );

  // Timing trap: stamp the client's render time on mount. Empty during SSR /
  // before hydration, which the server treats as ambiguous (fail-open), never
  // as a bot (see lib/bot-protection.ts).
  const [renderedAt, setRenderedAt] = useState('');
  useEffect(() => {
    setRenderedAt(String(Date.now()));
  }, []);

  if (state.ok) {
    return (
      <p role="status" className="mt-8 text-sm text-ink">
        Thanks for reaching out — your message has been sent. We&apos;ll be in
        touch.
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-8 space-y-5" noValidate>
      {/* Honeypot: hidden from humans and assistive tech, filled only by naive
          bots. aria-hidden + tabIndex=-1 + autoComplete=off keep screen readers
          and password managers away so a real user is never flagged. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '-9999px',
          width: 1,
          height: 1,
          overflow: 'hidden',
        }}
      >
        <label htmlFor="company">Company</label>
        <input
          id="company"
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {/* Timing trap value. */}
      <input type="hidden" name="rendered_at" value={renderedAt} readOnly />

      <div className="space-y-1.5">
        <label htmlFor="name" className="block text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={200}
          className="w-full px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          maxLength={320}
          className="w-full px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="message" className="block text-sm font-medium">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          maxLength={5000}
          className="w-full px-3 py-2 text-sm"
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary text-sm">
        {pending ? 'Sending…' : 'Send message'}
      </button>
    </form>
  );
}
