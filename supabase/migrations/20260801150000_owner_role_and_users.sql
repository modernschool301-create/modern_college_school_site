-- ============================================================================
-- Phase 2 — The Users module: the 'owner' tier, and the profiles policies that
-- let exactly one person manage staff accounts.
--
-- ┌─ THIS SUPERSEDES THE PRD'S FLAT ROLE MODEL ───────────────────────────────┐
-- │ PRD §2 states "two roles only" and §2.1 "exactly one privileged role and  │
-- │ no internal tiering within it", with every Admin able to create other     │
-- │ Admins. That is REVISED here, deliberately and with the PRD's own         │
-- │ blessing: §2.1 anticipated a second tier arriving as "a new enum value    │
-- │ plus a few policy branches, not a rewrite", and that is exactly the shape │
-- │ of this migration.                                                        │
-- │                                                                           │
-- │ The revision: account management is no longer something every Admin may   │
-- │ do. It belongs to a single OWNER. Admins keep every content power they    │
-- │ had; they simply cannot mint or manage colleagues.                        │
-- │                                                                           │
-- │ WHY: PRD §2 calls role assignment "the only door to power". A door held   │
-- │ by everyone who walked through it is not held at all — any admin could    │
-- │ create admins, and one compromised or departing staff account could       │
-- │ silently widen access. One owner makes that door answerable to a person.  │
-- │                                                                           │
-- │ OWNERSHIP IS TRANSFERABLE, and is nothing but a value in a profile row.   │
-- │ It is not tied to an email address, a uuid in code, or an env var. A      │
-- │ handover — or an owner who changes their address, or leaves — is one      │
-- │ UPDATE through the Users page, not a migration and not a support call.    │
-- │ That is why §5 below promotes the seeded account BY EMAIL LOOKUP rather   │
-- │ than by a hardcoded uuid: this file names the first owner, it does not    │
-- │ define who the owner is.                                                  │
-- └───────────────────────────────────────────────────────────────────────────┘
--
-- The enum value itself is added in 20260801145000_owner_role_enum_value.sql,
-- which must run first — see that file for why it cannot live here.
-- ============================================================================


-- 1. The owner check ----------------------------------------------------------
-- Mirrors current_user_is_active_admin() exactly, including the two
-- non-negotiables from the original migration:
--   * SECURITY DEFINER so a policy ON profiles may call it without recursing
--     back through that same policy (infinite loop).
--   * `set search_path = ''` + fully-qualified names to defeat search_path
--     hijacking.
-- Reads LIVE from profiles, never from the session/JWT (PRD 9.1), so losing
-- ownership bites on the ex-owner's very next action.
create or replace function public.current_user_is_owner()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'owner'
      and is_active = true
  );
$$;

-- Only signed-in users ever ask this question; anon never should.
revoke all on function public.current_user_is_owner() from public;
grant execute on function public.current_user_is_owner() to authenticated;


-- 2. An owner IS an active admin ----------------------------------------------
-- ┌─ THE LOAD-BEARING LINE OF THIS MIGRATION ─────────────────────────────────┐
-- │ current_user_is_active_admin() now returns true for BOTH 'admin' and      │
-- │ 'owner'. An owner is an admin with extra powers, NOT a parallel track.    │
-- │                                                                           │
-- │ Every content policy in the project — news, gallery, programmes,          │
-- │ specializations, achievements, testimonials, scholarships, downloads,     │
-- │ settings, and the /admin layout's own live role check — is written        │
-- │ against this one function. If it stopped matching 'owner', promoting the  │
-- │ seeded account in §5 would instantly lock that account out of every       │
-- │ module and out of /admin entirely.                                        │
-- │                                                                           │
-- │ NOTHING ELSE NEEDS CHANGING as a result: no other policy references the   │
-- │ role column directly, they all route through this function, which is      │
-- │ precisely the "written once, used everywhere" property PRD §9.1 asked     │
-- │ for. This is that promise being cashed in.                                │
-- └───────────────────────────────────────────────────────────────────────────┘
create or replace function public.current_user_is_active_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'owner')
      and is_active = true
  );
$$;


-- 3. profiles — account management is OWNER-ONLY ------------------------------
-- The original migration left a commented-out sketch of an
-- "admin-edits-anyone" policy written against current_user_is_active_admin().
-- It is deliberately NOT built that way. These two policies replace that sketch
-- and are gated on current_user_is_OWNER().

-- INSERT exists at all only because there is deliberately NO signup trigger on
-- auth.users (PRD 9.2): the Users page creates the auth user through the admin
-- API and must then write the matching profile row itself. Restricted to an
-- owner, so this is not a door back into self-signup — a session with no owner
-- role cannot insert a profile no matter what it sends.
create policy "profiles_insert_owner"
on public.profiles
for insert
to authenticated
with check ( public.current_user_is_owner() );

-- UPDATE anyone: roles, active status, names. Owner only.
--
-- ┌─ WHAT IS DELIBERATELY *NOT* IN THIS POLICY ───────────────────────────────┐
-- │ No `id <> auth.uid()` clause, and no guard against an owner deactivating  │
-- │ or demoting themselves. Two reasons:                                      │
-- │                                                                           │
-- │  1. The ownership TRANSFER flow needs it. Handing over means promoting a  │
-- │     colleague and then demoting yourself — a write to your own row that   │
-- │     changes your own role. A database-level self-guard would make         │
-- │     handover impossible without a migration, which is exactly the         │
-- │     brittleness this design is avoiding.                                  │
-- │                                                                           │
-- │  2. Self-lockout is a USABILITY guard, not a security boundary. PRD §2.2  │
-- │     says the system must not let the school lock itself out — that is a   │
-- │     protection FOR the owner against a slip, not a protection against an  │
-- │     attacker. An owner who can already rewrite every profile row gains    │
-- │     nothing by rewriting their own. So the guards live in the server      │
-- │     actions and the UI (see app/admin/users/actions.ts), where they can   │
-- │     also EXPLAIN themselves to the person who tripped them.               │
-- │                                                                           │
-- │ The genuine security boundary — only an owner may write to profiles at    │
-- │ all — IS enforced here, by RLS, and a hidden button is never the reason   │
-- │ anything fails. A demoted owner's next attempt fails on this policy.      │
-- └───────────────────────────────────────────────────────────────────────────┘
create policy "profiles_update_owner_manages_accounts"
on public.profiles
for update
to authenticated
using ( public.current_user_is_owner() )
with check ( public.current_user_is_owner() );


-- 4. Unchanged, restated for the reader ---------------------------------------
-- These policies from 20260728120000 are NOT modified:
--   * profiles_select_own_or_admin — a user reads their own row; an active
--     admin reads all. It calls current_user_is_active_admin(), so an owner is
--     covered by §2 above with no edit needed.
--   * profiles_update_own — the /account self-edit (PRD 30.2): full_name only,
--     never one's own role, is_active, email, or id. An owner is bound by it
--     too when acting on their own row through /account; the owner policy above
--     is what lets them act deliberately through /admin/users instead.
--
-- And still NO DELETE POLICY FOR ANYONE, including the owner. Accounts are
-- deactivated, never deleted (PRD 2.2). There is no delete path in this system
-- and this migration does not add one.


-- 5. Name the first owner -----------------------------------------------------
-- BY EMAIL LOOKUP, not a hardcoded uuid: the uuid is environment-specific
-- (local, staging and production each seeded their own auth user), and this file
-- must be replayable against any of them.
--
-- If the address is not present the UPDATE simply affects zero rows and the
-- migration still succeeds — a database with no seeded account is not a broken
-- one, it just has no owner yet, and ownership can be granted by hand exactly as
-- the first admin was.
--
-- This names the first owner; it does not define who the owner is. Ownership
-- moves through the Users page from here on.
update public.profiles
set role = 'owner'
where email = 'modernschool301@gmail.com';
