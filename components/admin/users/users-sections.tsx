'use client';

import { useActionState } from 'react';
import { ConfirmSubmitButton } from '@/components/admin/confirm-submit-button';
import {
  createUser,
  setUserActive,
  updateUserName,
  transferOwnership,
  type UserFormState,
} from '@/app/admin/users/actions';
import {
  MIN_PASSWORD_LENGTH,
  USER_ROLE_LABELS,
  type Profile,
} from '@/lib/users';

export type AdminUserRow = Pick<
  Profile,
  'id' | 'email' | 'full_name' | 'role' | 'is_active' | 'created_at'
>;

const actionClass =
  'rounded-sm border border-line px-3 py-1 text-sm font-medium transition-colors hover:bg-green-mist';
const inputClass = 'w-full px-3 py-2 text-sm';
const initialState: UserFormState = { error: null, notice: null, saved: false };

// Nepal time (UTC+05:45), Gregorian, English — the project-wide convention.
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kathmandu',
  });
}

export function CreateUserSection({ userCount }: { userCount: number }) {
  const [state, formAction, pending] = useActionState(createUser, initialState);

  return (
    <section>
      <h2 className="font-display text-h3 text-green-ink">Add an account</h2>
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">
        Creates a staff account that can manage content straight away. New
        accounts are Admins — only an Owner can manage accounts, and there is
        only ever one.
      </p>

      <form
        action={formAction}
        className="mt-4 max-w-2xl space-y-4 rounded-md border border-line p-4"
      >
        {/* Keyed on the count so a successful add REMOUNTS the fields: the
            password box empties rather than leaving one person's temporary
            password on screen while the next is typed. */}
        <div key={userCount} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="new-user-name" className="block text-sm font-medium">
                Full name
              </label>
              <input
                id="new-user-name"
                name="full_name"
                required
                defaultValue=""
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="new-user-email" className="block text-sm font-medium">
                Email address
              </label>
              <input
                id="new-user-email"
                name="email"
                type="email"
                required
                defaultValue=""
                className={inputClass}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="new-user-password"
              className="block text-sm font-medium"
            >
              Temporary password
            </label>
            <input
              id="new-user-password"
              name="password"
              type="text"
              required
              minLength={MIN_PASSWORD_LENGTH}
              defaultValue=""
              autoComplete="off"
              aria-describedby="new-user-password-hint"
              className={`${inputClass} font-mono`}
            />
            <p id="new-user-password-hint" className="text-small text-ink-muted">
              At least {MIN_PASSWORD_LENGTH} characters. Make up a{' '}
              <strong>different throwaway password for each person</strong> —
              never reuse one, and never use a password you use elsewhere. Tell
              them directly (in person, by phone), not in the same email as
              anything else. They will also receive a link to set their own
              password, which is what they should do; this one only exists so
              they are not locked out if the email does not arrive.
            </p>
          </div>
        </div>

        {state.error && (
          <p role="alert" className="text-sm text-danger">
            {state.error}
          </p>
        )}
        {state.notice && (
          <p role="status" className="text-sm text-ink">
            {state.notice}
          </p>
        )}
        {state.saved && !state.notice && (
          <p role="status" className="text-sm text-green-brand">
            Account created. They can sign in now, and have been emailed a link
            to set their own password.
          </p>
        )}

        <button type="submit" disabled={pending} className="btn-primary text-sm">
          {pending ? 'Creating…' : 'Create account'}
        </button>
      </form>
    </section>
  );
}

function UserRow({ user, isSelf }: { user: AdminUserRow; isSelf: boolean }) {
  return (
    <li className="rounded-md border border-line p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-medium text-green-ink">
            {user.full_name ?? 'Unnamed'}
            {isSelf && (
              <span className="ml-2 rounded-full bg-green-mist px-2 py-0.5 text-xs font-medium text-green-ink">
                You
              </span>
            )}
          </p>
          <p className="mt-0.5 text-small text-ink-muted">{user.email}</p>
          <p className="mt-1 text-small text-ink-muted">
            {USER_ROLE_LABELS[user.role]} · added {formatDate(user.created_at)}
          </p>
        </div>

        <span
          className={
            user.is_active
              ? 'badge badge-neutral'
              : 'rounded-full border border-line px-2.5 py-0.5 text-xs font-medium text-ink-muted'
          }
        >
          {user.is_active ? 'Active' : 'Deactivated'}
        </span>
      </div>

      <form
        action={updateUserName}
        className="mt-3 flex flex-wrap items-end gap-3 border-t border-line pt-3"
      >
        <input type="hidden" name="id" value={user.id} />
        <div className="min-w-0 flex-1 space-y-1.5">
          <label
            htmlFor={`user-name-${user.id}`}
            className="block text-sm font-medium"
          >
            Name
          </label>
          <input
            id={`user-name-${user.id}`}
            name="full_name"
            required
            defaultValue={user.full_name ?? ''}
            className={inputClass}
          />
        </div>
        <button type="submit" className={actionClass}>
          Save name
        </button>
      </form>

      <div className="mt-3 border-t border-line pt-3">
        {isSelf ? (
          // The self-lockout guard, explained rather than merely absent. The
          // server refuses the same action if the form is posted by hand — this
          // text is the courtesy, not the enforcement.
          <p className="text-small text-ink-muted">
            You cannot deactivate or demote your own account — that is how the
            school avoids locking itself out of its own administration. To step
            down, hand ownership to another admin below.
          </p>
        ) : (
          <form action={setUserActive}>
            <input type="hidden" name="id" value={user.id} />
            <input
              type="hidden"
              name="active"
              value={user.is_active ? 'false' : 'true'}
            />
            {user.is_active ? (
              <ConfirmSubmitButton
                confirmText={`Deactivate ${user.full_name ?? user.email}? They will be signed out of the admin area on their next action. This can be undone.`}
                className="rounded-sm border border-line px-3 py-1 text-sm font-medium text-danger transition-colors hover:bg-danger-bg"
              >
                Deactivate
              </ConfirmSubmitButton>
            ) : (
              <button type="submit" className={actionClass}>
                Reactivate
              </button>
            )}
          </form>
        )}
      </div>
    </li>
  );
}

export function UsersListSection({
  users,
  currentUserId,
}: {
  users: AdminUserRow[];
  currentUserId: string;
}) {
  return (
    <section>
      <h2 className="font-display text-h3 text-green-ink">
        Staff accounts <span className="text-ink-muted">({users.length})</span>
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">
        Accounts are deactivated, never deleted, so a person&rsquo;s history and
        their name on past work stay intact. A deactivated account cannot sign
        in and cannot write anything.
      </p>

      <ul className="mt-4 space-y-3">
        {users.map((user) => (
          <UserRow
            key={user.id}
            user={user}
            isSelf={user.id === currentUserId}
          />
        ))}
      </ul>
    </section>
  );
}

export function TransferOwnershipSection({
  candidates,
}: {
  // Active admins only — ownership cannot be handed to a deactivated account.
  candidates: AdminUserRow[];
}) {
  const [state, formAction, pending] = useActionState(
    transferOwnership,
    initialState,
  );

  return (
    <section>
      <h2 className="font-display text-h3 text-green-ink">Transfer ownership</h2>
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">
        There is exactly one Owner. Handing it over makes the chosen admin the
        Owner and makes <strong>you a regular admin</strong> — you keep every
        content power you have now, and you lose this page. Only the new Owner
        will be able to add, deactivate, or rename accounts, including yours.
      </p>

      {candidates.length === 0 ? (
        <p className="mt-4 text-sm text-ink-muted">
          There is no one to hand ownership to yet. Add another account first —
          ownership can only go to an active admin.
        </p>
      ) : (
        <form
          action={formAction}
          className="mt-4 max-w-2xl space-y-4 rounded-md border border-line p-4"
        >
          <div className="space-y-1.5">
            <label htmlFor="transfer-id" className="block text-sm font-medium">
              New owner
            </label>
            <select
              id="transfer-id"
              name="id"
              required
              defaultValue=""
              className={`${inputClass} sm:max-w-sm`}
            >
              <option value="" disabled>
                Choose an admin…
              </option>
              {candidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.full_name ?? candidate.email} ({candidate.email})
                </option>
              ))}
            </select>
          </div>

          {/* The explicit confirmation step, required by the server too. */}
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              name="confirm"
              value="yes"
              required
              className="mt-0.5 h-4 w-4 shrink-0"
            />
            <span>
              I understand that I will become a regular admin and will lose
              access to account management.
            </span>
          </label>

          {state.error && (
            <p role="alert" className="text-sm text-danger">
              {state.error}
            </p>
          )}
          {state.saved && (
            <p role="status" className="text-sm text-green-brand">
              Ownership transferred.
            </p>
          )}

          <ConfirmSubmitButton
            confirmText="Transfer ownership? You will become a regular admin and will no longer be able to manage accounts. Only the new owner can give it back."
            className="rounded-sm border border-danger px-4 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger-bg disabled:opacity-50"
          >
            {pending ? 'Transferring…' : 'Transfer ownership'}
          </ConfirmSubmitButton>
        </form>
      )}
    </section>
  );
}
