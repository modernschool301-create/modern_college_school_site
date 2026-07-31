'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireActiveOwner } from '@/lib/auth-guard';
import { looksLikeEmail, MIN_PASSWORD_LENGTH } from '@/lib/users';

export type UserFormState = {
  error: string | null;
  // A non-fatal complication the owner must still be told about (a created
  // account whose invitation email did not go out). Distinct from `error`
  // because the action SUCCEEDED — reporting it as a failure would invite the
  // owner to try again and create a duplicate.
  notice: string | null;
  saved: boolean;
};

// Generic message for DB failures. Raw Postgres text (e.g. "violates row-level
// security policy") is logged server-side, never surfaced to the browser.
const SAVE_FAILED = 'Something went wrong. Please try again.';

function revalidateUsers() {
  revalidatePath('/admin/users');
}

// ┌─ WHERE THE SELF-LOCKOUT GUARDS LIVE, AND WHY ─────────────────────────────┐
// │ Every guard below (no deactivating yourself, no demoting yourself outside │
// │ the transfer flow, no removing the last active owner) is enforced HERE and│
// │ in the UI — NOT in a database policy.                                     │
// │                                                                           │
// │ That is deliberate. Self-lockout is a USABILITY guard: it protects the    │
// │ owner from a slip, per PRD §2.2's promise that the system will not let    │
// │ the school lock itself out. It is not a security boundary, because the    │
// │ person it stops already has full authority over every profile row — they  │
// │ gain nothing by editing their own. A server action can also EXPLAIN       │
// │ itself, which a policy violation cannot.                                  │
// │                                                                           │
// │ The genuine boundary — only an owner may write to profiles at all — IS in │
// │ RLS (profiles_insert_owner / profiles_update_owner_manages_accounts). So  │
// │ a hidden button is never the reason anything fails: a demoted owner who   │
// │ kept this page open and posted anyway is refused by the database.         │
// └───────────────────────────────────────────────────────────────────────────┘

/**
 * Create a staff account.
 *
 * Two systems, two steps: the auth user (Supabase Auth, via the service-role
 * admin API) and the profile row (our table). There is deliberately NO signup
 * trigger tying them together (PRD 9.2), so this action owns the seam.
 */
export async function createUser(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const { supabase } = await requireActiveOwner();

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const fullName = String(formData.get('full_name') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !looksLikeEmail(email)) {
    return { error: 'Please enter a valid email address.', notice: null, saved: false };
  }
  if (!fullName) {
    return { error: 'Please enter a name for this account.', notice: null, saved: false };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      error: `The temporary password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      notice: null,
      saved: false,
    };
  }

  // 1. The auth user. `email_confirm: true` marks the address already verified,
  //    so the new admin can sign in with the temporary password IMMEDIATELY —
  //    without it they would be stuck behind a confirmation email that this
  //    flow never sends.
  const service = createServiceClient();
  const { data: created, error: authError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !created?.user) {
    console.error('[users] auth.admin.createUser failed', authError);
    // The one case worth naming: retyping an existing colleague's address is a
    // realistic mistake, and "something went wrong" would send the owner
    // hunting for a fault that is not there.
    const duplicate = /already|exists|registered/i.test(authError?.message ?? '');
    return {
      error: duplicate
        ? 'An account with that email address already exists.'
        : SAVE_FAILED,
      notice: null,
      saved: false,
    };
  }

  const userId = created.user.id;

  // 2. The profile row, IMMEDIATELY — through the owner's own session, so the
  //    owner-only INSERT policy is what authorises it rather than the service
  //    key quietly bypassing RLS.
  const { error: profileError } = await supabase.from('profiles').insert({
    id: userId,
    email,
    full_name: fullName,
    role: 'admin', // never 'owner' — ownership moves only through transferOwnership
    is_active: true,
  });

  if (profileError) {
    console.error('[users] profile insert failed after auth user create', profileError);
    // ┌─ THE ORPHANED ACCOUNT ────────────────────────────────────────────────┐
    // │ The auth user EXISTS and the profile does not. That account can       │
    // │ authenticate but the /admin layout will bounce it forever, and there  │
    // │ is no UI anywhere that can see it — the Users page lists profiles, and│
    // │ this account has none. It is invisible and unrepairable from the app. │
    // │                                                                       │
    // │ So this error names the address and says exactly what to do. It is    │
    // │ the one place in the project that surfaces a specific failure rather  │
    // │ than a generic one: a generic message here would hide a real, stuck   │
    // │ account behind "please try again", and trying again fails on the      │
    // │ duplicate address forever.                                            │
    // │                                                                       │
    // │ Deliberately NOT auto-deleted. Rolling back would mean calling        │
    // │ auth.admin.deleteUser on a hard-to-verify assumption, and a stray     │
    // │ delete of a real account is worse than an orphan someone is told      │
    // │ about in plain words.                                                 │
    // └───────────────────────────────────────────────────────────────────────┘
    return {
      error:
        `The sign-in account for ${email} was created, but its staff profile could not be saved, ` +
        `so it cannot be used and will not appear in the list below. ` +
        `Delete the user "${email}" (id ${userId}) under Authentication in the Supabase dashboard, ` +
        `then add them again here.`,
      notice: null,
      saved: false,
    };
  }

  // 3. Offer the SECOND path in. The temporary password already works; this
  //    reset link lets the new admin set their own instead, which is the
  //    outcome we actually want. Both paths stay valid — the link does not
  //    invalidate the password.
  let notice: string | null = null;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    notice =
      'The account is ready and the temporary password works, but no invitation email was sent (the site URL is not configured on the server).';
  } else {
    // A fresh anon-side client: resetPasswordForEmail is a public operation and
    // has no business borrowing the owner's session.
    const publicClient = await createClient();
    const { error: mailError } = await publicClient.auth.resetPasswordForEmail(
      email,
      { redirectTo: `${siteUrl}/auth/confirm?next=/reset-password/update` },
    );
    if (mailError) {
      console.error('[users] invitation reset email failed', mailError);
      // NOT an error: the account exists and the temporary password works. The
      // owner simply has to share it directly rather than relying on the link.
      notice =
        'The account is ready and the temporary password works, but the invitation email could not be sent. Share the temporary password directly.';
    }
  }

  revalidateUsers();
  return { error: null, notice, saved: true };
}

/**
 * Deactivate or reactivate an account. Deactivation is this system's only
 * removal (PRD 2.2) — there is no delete path, and no DELETE policy to reach.
 */
export async function setUserActive(formData: FormData): Promise<void> {
  const { supabase, user } = await requireActiveOwner();

  const id = String(formData.get('id') ?? '');
  const active = String(formData.get('active') ?? '') === 'true';
  if (!id) return;

  // GUARD: never yourself. The UI omits the control on your own row; this is
  // the same rule enforced against a hand-posted form.
  if (id === user.id) {
    console.error('[users] refused self-deactivation attempt');
    return;
  }

  // GUARD: never the last active owner. In the single-owner model this is
  // already covered by the self-check above, since the only owner IS the caller
  // — but a transfer that half-completed can leave two owners, and this keeps
  // the invariant true in that window rather than assuming it away.
  if (!active) {
    const { data: target } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', id)
      .single();

    if (target?.role === 'owner') {
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'owner')
        .eq('is_active', true);

      if ((count ?? 0) <= 1) {
        console.error('[users] refused deactivating the last active owner');
        return;
      }
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ is_active: active })
    .eq('id', id);
  if (error) {
    console.error('[users] setUserActive failed', error);
    return;
  }

  revalidateUsers();
}

/** Correct a staff member's display name. */
export async function updateUserName(formData: FormData): Promise<void> {
  const { supabase } = await requireActiveOwner();

  const id = String(formData.get('id') ?? '');
  const fullName = String(formData.get('full_name') ?? '').trim();
  // A blank name would leave an unlabelled row in the staff list, so the edit is
  // simply not applied. The field is `required` in the browser too.
  if (!id || !fullName) return;

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', id);
  if (error) {
    console.error('[users] updateUserName failed', error);
    return;
  }

  revalidateUsers();
}

/**
 * Hand ownership to another active admin.
 *
 * ┌─ SINGLE OWNER, ENFORCED BY DEMOTING THE OUTGOING ONE ────────────────────┐
 * │ There is exactly one owner at a time. The alternative — allowing several │
 * │ — was rejected: co-owners can demote each other, with no tie-break and   │
 * │ no record of who was supposed to hold the role, which turns PRD §2's     │
 * │ "one door to power" into a door several people can lock each other out   │
 * │ of. One owner keeps the answer to "who holds it?" unambiguous, and the   │
 * │ role stays transferable, so a handover costs one action rather than a    │
 * │ negotiation.                                                             │
 * │                                                                          │
 * │ ORDER MATTERS, and it is promote-then-demote. The two writes are not a   │
 * │ transaction, so consider each failure:                                   │
 * │   • promote fails  → nothing changed; the caller is still owner.         │
 * │   • demote fails   → TWO owners briefly; either can finish the job.      │
 * │ Demoting first would risk the third outcome — ZERO owners, nobody able   │
 * │ to reach this page, and a hand-written SQL statement the only way back.  │
 * │ That outcome is designed out by ordering alone.                          │
 * └──────────────────────────────────────────────────────────────────────────┘
 */
export async function transferOwnership(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const { supabase, user } = await requireActiveOwner();

  const id = String(formData.get('id') ?? '');
  // The explicit confirmation, required on the server as well as in the UI:
  // this is the one action that takes power away from the person performing it.
  const confirmed = formData.get('confirm') === 'yes';

  if (!id) {
    return { error: 'Choose the admin who should become the owner.', notice: null, saved: false };
  }
  if (!confirmed) {
    return {
      error: 'Tick the confirmation box to transfer ownership.',
      notice: null,
      saved: false,
    };
  }
  if (id === user.id) {
    return { error: 'You are already the owner.', notice: null, saved: false };
  }

  // The recipient must be an ACTIVE ADMIN. Handing ownership to a deactivated
  // account would be a lockout with extra steps.
  const { data: target } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, is_active')
    .eq('id', id)
    .single();

  if (!target || !target.is_active || target.role !== 'admin') {
    return {
      error: 'Ownership can only be given to an active admin.',
      notice: null,
      saved: false,
    };
  }

  // 1. Promote. Never the other way round — see the box above.
  const { error: promoteError } = await supabase
    .from('profiles')
    .update({ role: 'owner' })
    .eq('id', id);
  if (promoteError) {
    console.error('[users] transferOwnership promote failed', promoteError);
    return { error: SAVE_FAILED, notice: null, saved: false };
  }

  // 2. Step down. This is the write the database policy deliberately permits —
  //    it is a change to the caller's OWN role, which no other flow allows.
  const { error: demoteError } = await supabase
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', user.id);
  if (demoteError) {
    console.error('[users] transferOwnership demote failed', demoteError);
    revalidateUsers();
    // Specific, because the state is real and recoverable and the owner needs
    // to know it: two owners now exist, and either can complete the handover.
    return {
      error:
        `${target.email} is now an owner, but your own account could not be changed back to admin, ` +
        `so there are currently two owners. Either of you can finish the handover by ` +
        `demoting this account from the Users page.`,
      notice: null,
      saved: false,
    };
  }

  // From the next request on, the caller is a plain admin and this page will
  // redirect them to /admin — which is the transfer working, not a fault.
  revalidateUsers();
  return { error: null, notice: null, saved: true };
}
