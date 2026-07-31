-- ============================================================================
-- Phase 2 — Specializations become a full sub-module: their own page content
-- and their own teaching staff.
--
-- This EXTENDS 20260801120000_programme_specializations.sql. Nothing there is
-- dropped or rewritten: title, description, image, display_order, the slug's
-- scoped-unique constraint, and the parent-gated RLS all stand exactly as they
-- were. Two additions only — a `body` column, and a faculty table.
--
-- Still NOT the Admissions stream picker. `management_streams` (Phase 3, PRD
-- Decision 5) remains a separate table with separate rules — retired rather than
-- deleted, because past submissions keep their label. Nothing here creates a
-- reference between the two, and Phase 3 must still build its own. See the
-- previous migration's header for the full reasoning.
-- ============================================================================


-- 1. body — the full page content ---------------------------------------------
-- `description` STAYS as the short plain-text card excerpt. The split mirrors
-- programmes exactly: `intro` (plain text; the card body and the page's lead
-- paragraph) vs `body` (markdown; the page itself). Two fields, one job each —
-- a card that rendered a markdown table would be unreadable, and a page whose
-- only text was a one-line excerpt would be pointless.
alter table public.programme_specializations
  add column body text;

comment on column public.programme_specializations.description is
  'Short PLAIN TEXT excerpt. Card body on the parent programme page, lead paragraph on the specialization page.';
comment on column public.programme_specializations.body is
  'MARKDOWN. The specialization page''s own content — curriculum tables, subjects, approach.';


-- 2. specialization_faculty ---------------------------------------------------
-- A DELIBERATE MIRROR of programme_faculty, not a polymorphic refactor of it.
--
-- The tempting move is to give programme_faculty a nullable specialization_id
-- and a check constraint ("exactly one parent"). It is rejected here: that table
-- is live with real rows, and the refactor would rewrite the constraint, both
-- SELECT policies, and every query against it — to save a table definition that
-- costs nothing to duplicate. A second table that copies a PROVEN shape is the
-- lower-risk change. The two never need to be queried together: a programme's
-- roster and a specialization's roster render on different pages.
create table public.specialization_faculty (
  id                uuid primary key default gen_random_uuid(),
  -- CASCADE, the same as programme_faculty: a roster row has no meaning without
  -- the specialization it teaches on. This is the SECOND link in a cascade
  -- chain — deleting a programme cascades to its specializations, which cascade
  -- to these rows.
  specialization_id uuid not null
                    references public.programme_specializations (id) on delete cascade,
  name              text not null,
  qualification     text,
  photo             text,                      -- Cloudinary public ID, nullable
  display_order     integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Specialization detail query is "this specialization's faculty, in display
-- order".
create index specialization_faculty_specialization_idx
  on public.specialization_faculty (specialization_id, display_order);


-- 3. Row Level Security — the project's first GRANDCHILD policy ---------------
alter table public.specialization_faculty enable row level security;

grant select on table public.specialization_faculty to anon;
grant select, insert, update, delete on table public.specialization_faculty to authenticated;

-- ┌─ TWO LEVELS, NOT ONE ─────────────────────────────────────────────────────┐
-- │ Every parent-gated child so far (gallery_photos, programme_faculty,       │
-- │ programme_specializations) sits ONE level below the row that owns the     │
-- │ publish decision, so its policy is a single EXISTS against that row.      │
-- │                                                                           │
-- │ This table sits TWO levels down:                                          │
-- │                                                                           │
-- │     specialization_faculty → programme_specializations → programmes       │
-- │                                                    (is_published lives here)│
-- │                                                                           │
-- │ programme_specializations has NO is_published of its own, so an EXISTS    │
-- │ that stopped at it would test nothing at all — it would confirm only that │
-- │ the parent row exists, and every faculty row would be world-readable      │
-- │ including those under an unpublished draft programme. The subquery must   │
-- │ WALK BOTH LEVELS and land on `p.is_published`, which is what the join     │
-- │ below does.                                                               │
-- │                                                                           │
-- │ Both intermediate tables are themselves under RLS and anon holds SELECT   │
-- │ on both, so the inner read can only ever see published programmes and     │
-- │ cannot be used to probe for the existence of a draft.                     │
-- │                                                                           │
-- │ Any future great-grandchild extends this chain — it does not shortcut to  │
-- │ the nearest ancestor.                                                     │
-- └───────────────────────────────────────────────────────────────────────────┘
--
-- SELECT is split by role so the anon branch NEVER calls
-- current_user_is_active_admin() (anon has no execute on it).
create policy "specialization_faculty_select_public"
on public.specialization_faculty for select to anon
using (
  exists (
    select 1
    from public.programme_specializations s
    join public.programmes p on p.id = s.programme_id
    where s.id = specialization_id
      and p.is_published
  )
);

create policy "specialization_faculty_select_authenticated"
on public.specialization_faculty for select to authenticated
using (
  exists (
    select 1
    from public.programme_specializations s
    join public.programmes p on p.id = s.programme_id
    where s.id = specialization_id
      and p.is_published
  )
  or public.current_user_is_active_admin()
);

-- Only an active admin may write. These rows are only ever managed from the
-- specialization's own edit screen, but each policy stands on its own whatever
-- UI reaches it — a deactivated admin's insert fails HERE, not merely because a
-- route redirected.
create policy "specialization_faculty_insert_admin"
on public.specialization_faculty for insert to authenticated
with check ( public.current_user_is_active_admin() );

create policy "specialization_faculty_update_admin"
on public.specialization_faculty for update to authenticated
using ( public.current_user_is_active_admin() )
with check ( public.current_user_is_active_admin() );

create policy "specialization_faculty_delete_admin"
on public.specialization_faculty for delete to authenticated
using ( public.current_user_is_active_admin() );


-- 4. updated_at maintained by the database (reuses set_updated_at) ------------
create trigger specialization_faculty_set_updated_at
before update on public.specialization_faculty
for each row
execute function public.set_updated_at();
