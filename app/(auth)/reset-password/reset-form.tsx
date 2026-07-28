'use client';

import { useActionState } from 'react';
import { requestReset, type ResetRequestState } from './actions';

const initialState: ResetRequestState = { done: false };

export function ResetForm() {
  const [state, formAction, pending] = useActionState(requestReset, initialState);

  // Same confirmation whether or not the address exists — never reveal it.
  if (state.done) {
    return (
      <p role="status" className="mt-8 text-sm text-zinc-700 dark:text-zinc-300">
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
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-zinc-900"
      >
        {pending ? 'Sending…' : 'Send reset link'}
      </button>
    </form>
  );
}
