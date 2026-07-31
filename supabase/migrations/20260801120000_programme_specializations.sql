-- ============================================================================
-- Phase 2 — Programme specializations (sub-programmes).
--
-- A GENERAL child capability on programmes, not a +2 Management feature. The
-- motivating case is Business Studies / Computer Science under +2 Management,
-- but nothing here is scoped to a level or to one programme: any programme may
-- own specialization rows, and a programme with none simply renders no section.
--
-- ┌─ NOT THE ADMISSIONS STREAM PICKER ────────────────────────────────────────┐
-- │ This table is DELIBERATELY SEPARATE from `management_streams` (Phase 3,   │
-- │ PRD Decision 5), the list that will back the Management admission form's  │
-- │ stream picker. They will look similar — both are short named lists that   │
-- │ hang off Management — and they are still two different things:            │
-- │                                                                           │
-- │   • programme_specializations is MARKETING CONTENT. Editor-ordered cards  │
-- │     on a public programme page. Freely renamed, reordered, and DELETED;   │
-- │     nothing downstream refers to a row.                                   │
-- │   • management_streams will be ADMISSIONS REFERENCE DATA, and carries the │
-- │     data-integrity rule this table does not: streams are RETIRED, never   │
-- │     deleted (`is_available` flips), because past submissions keep their   │
-- │     stream label. It also ships EMPTY by contract.                        │
-- │                                                                           │
-- │ So: NO shared table, NO foreign key, NO cross-reference in either         │
-- │ direction, and Phase 3 must build management_streams independently rather │
-- │ than reaching for this one. If the institution ever wants the two lists   │
-- │ to agree, that is an editorial matter, not a schema one — do not add a    │
-- │ join to enforce it. A future reader finding both tables should read this  │
-- │ box before assuming one is redundant.                                     │
-- └───────────────────────────────────────────────────────────────────────────┘
--
-- Shape copies programme_faculty exactly (which itself copies gallery_photos):
-- a child with NO is_published of its own, whose visibility is DERIVED from the
-- parent programme via an EXISTS subquery in RLS. One publish decision, one
-- place to change it, no way for parent and child to disagree.
--
-- The programme→specialization foreign key is ON DELETE CASCADE, so deleting a
-- programme takes its specialization ROWS with it. It does NOT take the
-- Cloudinary images: those become orphans and are swept by the monthly
-- reconciliation (PRD 10.3), the project-wide pattern.
--
-- `description` is PLAIN TEXT, not markdown. These render as cards in the
-- shared card grid, where the body slot is a paragraph — the markdown pipeline
-- (and .rich-text) belongs to `programmes.body`, which is a full article.
--
-- `slug` is unique WITHIN the parent programme, not globally, so two programmes
-- may each have a "computer-science". Nothing reads it yet: it is stored now so
-- a future /programmes/<programme>/<specialization> detail route has a stable
-- address to adopt without a data migration and without retro-slugging live
-- rows. Scoped uniqueness is what that nested route would need.
-- ============================================================================


-- 1. programme_specializations ------------------------------------------------
create table public.programme_specializations (
  id            uuid primary key default gen_random_uuid(),
  -- CASCADE: a specialization has no meaning without its programme, and an
  -- orphan would show as a phantom count on the admin list.
  programme_id  uuid not null references public.programmes (id) on delete cascade,
  title         text not null,
  slug          text not null,                 -- unique within the parent (see header)
  description   text,                          -- short PLAIN TEXT, not markdown
  image         text,                          -- Cloudinary public ID, nullable
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Scoped, NOT global: "computer-science" may exist under both +2 Management
  -- and a Bachelor programme, and each is a different page.
  constraint programme_specializations_slug_unique unique (programme_id, slug)
);

-- Programme detail query is "this programme's specializations, in display order".
create index programme_specializations_programme_idx
  on public.programme_specializations (programme_id, display_order);


-- 2. Row Level Security -------------------------------------------------------
alter table public.programme_specializations enable row level security;

-- Base privileges. anon may only ever SELECT (RLS filters by the parent's
-- published state); authenticated keeps full base privileges, with writes then
-- gated by policy.
grant select on table public.programme_specializations to anon;
grant select, insert, update, delete on table public.programme_specializations to authenticated;

-- A specialization has no is_published of its own: visibility FOLLOWS THE
-- PROGRAMME, identical to programme_faculty. The EXISTS subquery reads
-- programmes, which is itself under RLS — so for anon the inner read can only
-- ever see published programmes, and this check cannot be used to probe for the
-- existence of a draft programme. anon holds the SELECT grant on programmes
-- that the subquery needs.
--
-- SELECT is split by role so the anon branch NEVER calls
-- current_user_is_active_admin() (anon has no execute on it).
create policy "programme_specializations_select_public"
on public.programme_specializations for select to anon
using (
  exists (
    select 1 from public.programmes p
    where p.id = programme_id and p.is_published
  )
);

create policy "programme_specializations_select_authenticated"
on public.programme_specializations for select to authenticated
using (
  exists (
    select 1 from public.programmes p
    where p.id = programme_id and p.is_published
  )
  or public.current_user_is_active_admin()
);

-- Only an active admin may write. These rows are only ever created, reordered,
-- and removed from the parent programme's edit screen, but each policy stands
-- on its own regardless of which UI reaches it — a deactivated admin's insert
-- fails HERE, not merely because a button was hidden.
create policy "programme_specializations_insert_admin"
on public.programme_specializations for insert to authenticated
with check ( public.current_user_is_active_admin() );

create policy "programme_specializations_update_admin"
on public.programme_specializations for update to authenticated
using ( public.current_user_is_active_admin() )
with check ( public.current_user_is_active_admin() );

create policy "programme_specializations_delete_admin"
on public.programme_specializations for delete to authenticated
using ( public.current_user_is_active_admin() );


-- 3. updated_at maintained by the database (reuses set_updated_at) ------------
create trigger programme_specializations_set_updated_at
before update on public.programme_specializations
for each row
execute function public.set_updated_at();
