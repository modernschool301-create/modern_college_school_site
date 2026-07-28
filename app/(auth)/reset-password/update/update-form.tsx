'use client';

import { useActionState } from 'react';
import { updatePassword, type UpdateState } from './actions';

const initialState: UpdateState = { error: null };

export function UpdateForm() {
  const [state, formAction, pending] = useActionState(updatePassword, initialState);

  return (
    <form action={formAction} className="mt-8 space-y-5" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          className="w-full px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="confirm" className="block text-sm font-medium">
          Confirm new password
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          className="w-full px-3 py-2 text-sm"
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary w-full text-sm">
        {pending ? 'Saving…' : 'Set new password'}
      </button>
    </form>
  );
}
