'use client';

import { useActionState } from 'react';
import {
  updateOwnName,
  updateOwnPassword,
  type AccountState,
} from '@/app/account/actions';
import { MIN_PASSWORD_LENGTH } from '@/lib/users';

const inputClass = 'w-full px-3 py-2 text-sm';
const initialState: AccountState = { error: null, saved: false };

function Feedback({ state, savedText }: { state: AccountState; savedText: string }) {
  if (state.error) {
    return (
      <p role="alert" className="text-sm text-danger">
        {state.error}
      </p>
    );
  }
  if (state.saved) {
    return (
      <p role="status" className="text-sm text-green-brand">
        {savedText}
      </p>
    );
  }
  return null;
}

export function NameForm({ fullName }: { fullName: string }) {
  const [state, formAction, pending] = useActionState(
    updateOwnName,
    initialState,
  );

  return (
    <form action={formAction} className="mt-4 max-w-md space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="full_name" className="block text-sm font-medium">
          Your name
        </label>
        <input
          id="full_name"
          name="full_name"
          required
          defaultValue={fullName}
          className={inputClass}
        />
      </div>

      <Feedback state={state} savedText="Name saved." />

      <button type="submit" disabled={pending} className="btn-primary text-sm">
        {pending ? 'Saving…' : 'Save name'}
      </button>
    </form>
  );
}

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(
    updateOwnPassword,
    initialState,
  );

  return (
    <form action={formAction} className="mt-4 max-w-md space-y-4" noValidate>
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
          aria-describedby="password-hint"
          className={inputClass}
        />
        <p id="password-hint" className="text-small text-ink-muted">
          At least {MIN_PASSWORD_LENGTH} characters. If you signed in with a
          temporary password someone gave you, set your own here.
        </p>
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
          className={inputClass}
        />
      </div>

      <Feedback
        state={state}
        savedText="Password changed. You stay signed in on this device."
      />

      <button type="submit" disabled={pending} className="btn-primary text-sm">
        {pending ? 'Saving…' : 'Change password'}
      </button>
    </form>
  );
}
