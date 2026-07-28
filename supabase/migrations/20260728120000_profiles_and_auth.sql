-- ============================================================================
-- Phase 0.1 — Staff accounts: profiles table, role enum, active-admin
-- function, and Row Level Security.
--
-- PRD sections 8.1, 9.1, 9.2. CLAUDE.md security rules apply.
--
-- There is NO public signup in this system. This migration deliberately
-- creates NO signup trigger on auth.users and NO INSERT/DELETE policy on
-- profiles. The first admin is seeded by hand (see the seeding instructions);
-- every later admin is created from the future /admin/users page.
-- ============================================================================


-- 1. Role enum ---------------------------------------------------------------
-- A single value for now. Kept as an enum (not a boolean) so a future 'editor'
-- tier is a one-line `alter type ... add value 'editor'`, not a schema refactor.
create type public.user_role as enum ('admin');


-- 2. profiles table ----------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  full_name  text,
  role       public.user_role not null default 'admin',
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- 3. Live active-admin check -------------------------------------------------
-- Every "may this staff member do this?" decision routes through this one
-- function (PRD 9.1). It reads the CURRENT user's row LIVE from profiles and
-- returns true only for an active admin.
--
-- SECURITY DEFINER + `set search_path = ''` are non-negotiable:
--   * SECURITY DEFINER lets it run above RLS, so a policy on profiles can call
--     it WITHOUT recursing back through that same policy (infinite loop).
--   * Empty search_path + fully-qualified names (public.profiles, auth.uid())
--     defeat search_path hijacking.
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
      and role = 'admin'
      and is_active = true
  );
$$;

-- Only signed-in users ever ask this question; anon never should.
revoke all on function public.current_user_is_active_admin() from public;
grant execute on function public.current_user_is_active_admin() to authenticated;


-- 4. Row Level Security ------------------------------------------------------
alter table public.profiles enable row level security;

-- The anon (public) role gets NO access to this table whatsoever. RLS with no
-- permissive anon policy already denies it; revoking the table grant makes the
-- intent explicit and removes it as a surface entirely.
revoke all on table public.profiles from anon;

-- SELECT: a user may read their own row; an active admin may read every row.
create policy "profiles_select_own_or_admin"
on public.profiles
for select
to authenticated
using (
  auth.uid() = id
  or public.current_user_is_active_admin()
);

-- UPDATE (self-service): a user may update ONLY their own row, and may not
-- change role, is_active, email, or id.
--   * USING gates WHICH rows may be targeted (only your own).
--   * WITH CHECK validates the NEW row. RLS has no OLD/NEW handles, so each
--     immutable column's new value is compared against its currently-stored
--     value; any attempt to change one fails the check.
--   * `id` is pinned by the `auth.uid() = id` equality below: a changed id
--     would no longer equal auth.uid() and the check fails.
-- This is the /account self-edit policy (PRD 30.2). It lets a person change
-- their own full_name and nothing else that matters for access.
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using ( auth.uid() = id )
with check (
  auth.uid() = id
  and role      = (select p.role      from public.profiles p where p.id = auth.uid())
  and is_active = (select p.is_active from public.profiles p where p.id = auth.uid())
  and email     = (select p.email     from public.profiles p where p.id = auth.uid())
);

-- ---------------------------------------------------------------------------
-- FUTURE: admin-edits-anyone UPDATE policy for the /admin/users page.
-- (PRD 9.2 / 30.1) NOT built now. When the Users page is built, add a second
-- UPDATE policy here, written against current_user_is_active_admin(), that
-- lets an active admin change another account's role and is_active — with the
-- guard that an admin cannot deactivate or demote THEMSELVES (so the school
-- can't lock itself out). Example shape (do not enable yet):
--
--   create policy "profiles_update_admin_manages_others"
--   on public.profiles for update to authenticated
--   using ( public.current_user_is_active_admin() )
--   with check ( public.current_user_is_active_admin() and id <> auth.uid() );
-- ---------------------------------------------------------------------------

-- INSERT / DELETE: intentionally NO policies for anyone.
-- With RLS enabled and no permissive INSERT/DELETE policy, both operations are
-- denied for anon and authenticated alike. Profiles are created only by hand
-- (the first admin) or by the future Users page acting through the service-role
-- key (which bypasses RLS) — never from a browser session. Profiles are
-- deactivated, never deleted (PRD 2.2), so no DELETE path exists at all.


-- 5. updated_at maintained by the database, not the app ----------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();
