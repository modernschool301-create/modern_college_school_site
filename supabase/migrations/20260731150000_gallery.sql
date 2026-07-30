-- ============================================================================
-- Phase 1 — Gallery: albums and their photographs (PRD 8.2, 20, 28). The first
-- module with TWO related tables, and so the first where a child row's
-- visibility is DERIVED rather than declared.
--
-- gallery_photos deliberately has NO is_published column. A photo is visible
-- exactly when its album is: one publish decision, one place to change it, and
-- no way for the two to disagree. The cost is that the photo policies must reach
-- into the parent, which they do with an EXISTS subquery — see section 4.
--
-- The album→photo foreign key is ON DELETE CASCADE, so deleting an album takes
-- its photo ROWS with it. It does NOT take the Cloudinary assets: those become
-- orphans and are swept by the monthly reconciliation (PRD 10.3), which is the
-- project-wide pattern — no module deletes remote media inline.
--
-- Ordering is EDITOR-CONTROLLED at both levels (albums on the index, photos
-- within an album), the same as every other content module.
-- ============================================================================


-- 1. gallery_albums -----------------------------------------------------------
create table public.gallery_albums (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,          -- explicit web address
  title         text not null,
  cover_photo   text,                          -- Cloudinary public ID, nullable
  event_date    date,                          -- nullable; the day it happened
  display_order integer not null default 0,
  is_published  boolean not null default false,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Public index query is "published, in display order"; index for it.
create index gallery_albums_published_idx
  on public.gallery_albums (is_published, display_order);


-- 2. gallery_photos -----------------------------------------------------------
create table public.gallery_photos (
  id            uuid primary key default gen_random_uuid(),
  -- CASCADE: an album's photos have no meaning without the album, and leaving
  -- orphan rows behind would show up as phantom counts on the index.
  album_id      uuid not null references public.gallery_albums (id) on delete cascade,
  photo_file    text not null,                 -- Cloudinary public ID
  caption       text,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Album detail query is "this album's photos, in display order"; index for it.
create index gallery_photos_album_idx
  on public.gallery_photos (album_id, display_order);


-- 3. Row Level Security — albums ----------------------------------------------
alter table public.gallery_albums enable row level security;

-- Base privileges. anon may only ever SELECT (RLS filters to published);
-- authenticated keeps full base privileges (writes are then gated by policy).
grant select on table public.gallery_albums to anon;
grant select, insert, update, delete on table public.gallery_albums to authenticated;

-- SELECT is split by role so the anon branch NEVER calls
-- current_user_is_active_admin() (anon has no execute on it): anon sees only
-- published albums; an active admin additionally sees drafts.
create policy "gallery_albums_select_public"
on public.gallery_albums for select to anon
using ( is_published = true );

create policy "gallery_albums_select_authenticated"
on public.gallery_albums for select to authenticated
using ( is_published = true or public.current_user_is_active_admin() );

-- Only an active admin may write.
create policy "gallery_albums_insert_admin"
on public.gallery_albums for insert to authenticated
with check ( public.current_user_is_active_admin() );

create policy "gallery_albums_update_admin"
on public.gallery_albums for update to authenticated
using ( public.current_user_is_active_admin() )
with check ( public.current_user_is_active_admin() );

create policy "gallery_albums_delete_admin"
on public.gallery_albums for delete to authenticated
using ( public.current_user_is_active_admin() );


-- 4. Row Level Security — photos ----------------------------------------------
alter table public.gallery_photos enable row level security;

grant select on table public.gallery_photos to anon;
grant select, insert, update, delete on table public.gallery_photos to authenticated;

-- A photo has no is_published of its own: visibility FOLLOWS THE ALBUM. The
-- EXISTS subquery reads gallery_albums, which is itself under RLS — so for anon
-- the inner read can only ever see published albums, and the check cannot be
-- used to probe for the existence of a draft album. anon holds the SELECT grant
-- on gallery_albums that this subquery needs.
create policy "gallery_photos_select_public"
on public.gallery_photos for select to anon
using (
  exists (
    select 1 from public.gallery_albums a
    where a.id = album_id and a.is_published
  )
);

create policy "gallery_photos_select_authenticated"
on public.gallery_photos for select to authenticated
using (
  exists (
    select 1 from public.gallery_albums a
    where a.id = album_id and a.is_published
  )
  or public.current_user_is_active_admin()
);

-- Only an active admin may write. Photos are only ever created and reordered
-- from the album's edit screen, but the policy stands on its own regardless of
-- which UI reaches it.
create policy "gallery_photos_insert_admin"
on public.gallery_photos for insert to authenticated
with check ( public.current_user_is_active_admin() );

create policy "gallery_photos_update_admin"
on public.gallery_photos for update to authenticated
using ( public.current_user_is_active_admin() )
with check ( public.current_user_is_active_admin() );

create policy "gallery_photos_delete_admin"
on public.gallery_photos for delete to authenticated
using ( public.current_user_is_active_admin() );


-- 5. updated_at maintained by the database (reuses set_updated_at) ------------
create trigger gallery_albums_set_updated_at
before update on public.gallery_albums
for each row
execute function public.set_updated_at();

create trigger gallery_photos_set_updated_at
before update on public.gallery_photos
for each row
execute function public.set_updated_at();
