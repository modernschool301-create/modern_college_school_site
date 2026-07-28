'use client';

import { useActionState } from 'react';
import { requestReset, type ResetRequestState } from './actions';

const initialState: ResetRequestState = { done: false };

export function ResetForm() {
  const [state, formAction, pending] = useActionState(requestReset, initialState);

  // Same confirmation whether or not the address exists — never reveal it.
  if (state.done) {
    return (
      <p role="status" className="mt-8 text-sm text-ink">
        If that email is registered, a reset link has been sent. Check your inbox.
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-8 space-y-5" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="w-full px-3 py-2 text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="btn-primary w-full text-sm"
      >
        {pending ? 'Sending…' : 'Send reset link'}
      </button>
    </form>
  );
}
