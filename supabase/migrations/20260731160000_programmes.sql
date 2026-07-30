-- ============================================================================
-- Phase 2 — Programmes and their faculty rows (PRD 8.2, 13, 14, 28,
-- Decision 9). The second module with TWO related tables, and it copies the
-- gallery migration's shape exactly: a parent that owns its publish decision,
-- and a child whose visibility is DERIVED from that parent rather than declared.
--
-- programme_faculty deliberately has NO is_published column, the same call as
-- gallery_photos. A faculty member is visible exactly when their programme is:
-- one publish decision, one place to change it, and no way for the two to
-- disagree. The cost is that the faculty policies must reach into the parent,
-- which they do with an EXISTS subquery — see section 5.
--
-- The programme→faculty foreign key is ON DELETE CASCADE, so deleting a
-- programme takes its faculty ROWS with it. It does NOT take the Cloudinary
-- assets: those become orphans and are swept by the monthly reconciliation
-- (PRD 10.3), the project-wide pattern — no module deletes remote media inline.
--
-- Decision 9 is what splits this into two tables at all: faculty turn over
-- yearly and are therefore editable ROWS, while the curriculum/subject tables
-- are relatively stable and live as markdown inside `body`.
--
-- ┌─ BEYOND THE PRD ──────────────────────────────────────────────────────────┐
-- │ `cover_image` is NOT in PRD 8.2's programmes field list. It is added here  │
-- │ deliberately, for visual consistency: every other content module (posts,   │
-- │ achievements, gallery albums, testimonials) carries an image, and the      │
-- │ programmes index at PRD 13 renders as cards in the same shared card grid.  │
-- │ Without it, programme cards would be the only ones on the site permanently │
-- │ falling back to the filler image. Nullable, so it stays optional.          │
-- └───────────────────────────────────────────────────────────────────────────┘
--
-- Ordering is EDITOR-CONTROLLED at both levels (programmes on the index, faculty
-- within a programme), the same as every other content module.
-- ============================================================================


-- 1. Programme level enum -----------------------------------------------------
-- Modelled on public.post_type (news) and public.download_category (downloads):
-- a FIXED vocabulary set by the institution's structure (PRD 8.2 — Secondary /
-- +2 / Bachelor), not editor-managed data like news_categories. Stored as snake
-- case; the display labels ('+2' and so on) live in lib/programmes.ts, so the
-- database keeps a stable value and the presentation can change without a
-- migration.
create type public.programme_level as enum ('secondary', 'plus_two', 'bachelor');


-- 2. programmes ---------------------------------------------------------------
create table public.programmes (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,          -- explicit web address
  title         text not null,
  level         public.programme_level not null,
  intro         text,                          -- short standfirst
  body          text,                          -- markdown: curriculum tables, activities, pedagogy
  cover_image   text,                          -- Cloudinary public ID, nullable (see header)
  display_order integer not null default 0,
  is_published  boolean not null default false,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Public index query is "published, in display order"; index for it.
create index programmes_published_idx
  on public.programmes (is_published, display_order);


-- 3. programme_faculty --------------------------------------------------------
create table public.programme_faculty (
  id            uuid primary key default gen_random_uuid(),
  -- CASCADE: a programme's faculty rows have no meaning without the programme,
  -- and leaving orphans behind would show up as phantom counts on the admin
  -- list.
  programme_id  uuid not null references public.programmes (id) on delete cascade,
  name          text not null,
  qualification text,
  photo         text,                          -- Cloudinary public ID, nullable
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Programme detail query is "this programme's faculty, in display order".
create index programme_faculty_programme_idx
  on public.programme_faculty (programme_id, display_order);


-- 4. Row Level Security — programmes ------------------------------------------
alter table public.programmes enable row level security;

-- Base privileges. anon may only ever SELECT (RLS filters to published);
-- authenticated keeps full base privileges (writes are then gated by policy).
grant select on table public.programmes to anon;
grant select, insert, update, delete on table public.programmes to authenticated;

-- SELECT is split by role so the anon branch NEVER calls
-- current_user_is_active_admin() (anon has no execute on it): anon sees only
-- published programmes; an active admin additionally sees drafts.
create policy "programmes_select_public"
on public.programmes for select to anon
using ( is_published = true );

create policy "programmes_select_authenticated"
on public.programmes for select to authenticated
using ( is_published = true or public.current_user_is_active_admin() );

-- Only an active admin may write.
create policy "programmes_insert_admin"
on public.programmes for insert to authenticated
with check ( public.current_user_is_active_admin() );

create policy "programmes_update_admin"
on public.programmes for update to authenticated
using ( public.current_user_is_active_admin() )
with check ( public.current_user_is_active_admin() );

create policy "programmes_delete_admin"
on public.programmes for delete to authenticated
using ( public.current_user_is_active_admin() );


-- 5. Row Level Security — faculty ---------------------------------------------
alter table public.programme_faculty enable row level security;

grant select on table public.programme_faculty to anon;
grant select, insert, update, delete on table public.programme_faculty to authenticated;

-- A faculty row has no is_published of its own: visibility FOLLOWS THE
-- PROGRAMME. The EXISTS subquery reads programmes, which is itself under RLS —
-- so for anon the inner read can only ever see published programmes, and the
-- check cannot be used to probe for the existence of a draft programme. anon
-- holds the SELECT grant on programmes that this subquery needs.
create policy "programme_faculty_select_public"
on public.programme_faculty for select to anon
using (
  exists (
    select 1 from public.programmes p
    where p.id = programme_id and p.is_published
  )
);

create policy "programme_faculty_select_authenticated"
on public.programme_faculty for select to authenticated
using (
  exists (
    select 1 from public.programmes p
    where p.id = programme_id and p.is_published
  )
  or public.current_user_is_active_admin()
);

-- Only an active admin may write. Faculty rows are only ever created and
-- reordered from the programme's edit screen, but the policy stands on its own
-- regardless of which UI reaches it.
create policy "programme_faculty_insert_admin"
on public.programme_faculty for insert to authenticated
with check ( public.current_user_is_active_admin() );

create policy "programme_faculty_update_admin"
on public.programme_faculty for update to authenticated
using ( public.current_user_is_active_admin() )
with check ( public.current_user_is_active_admin() );

create policy "programme_faculty_delete_admin"
on public.programme_faculty for delete to authenticated
using ( public.current_user_is_active_admin() );


-- 6. updated_at maintained by the database (reuses set_updated_at) ------------
create trigger programmes_set_updated_at
before update on public.programmes
for each row
execute function public.set_updated_at();

create trigger programme_faculty_set_updated_at
before update on public.programme_faculty
for each row
execute function public.set_updated_at();
