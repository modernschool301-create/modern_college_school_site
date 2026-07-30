-- ============================================================================
-- Phase 1 — Downloads: the public resource library (PRD 8.2, 23, 28), copied
-- from `scholarships` EXACTLY for grants, policies and trigger.
--
-- anon MAY read published rows, so we grant SELECT to anon and filter drafts out
-- with a policy (PRD 9.3); the `authenticated` base grants are KEPT (base grants
-- and RLS are ANDed — revoking would break admin writes) and every write is
-- gated on current_user_is_active_admin(), which reads the role live from
-- profiles.
--
-- `file` is a Cloudinary public ID and is NOT NULL: a download row without a
-- file is a broken link, unlike the nullable cover images elsewhere. It is
-- stored as a RAW resource (see lib/cloudinary-sign.ts), so the public ID
-- INCLUDES the file extension — raw delivery URLs carry no extension of their
-- own, so it has to live in the ID.
--
-- `category` is an enum, modelled on public.post_type in the news migration: the
-- four values are a fixed vocabulary (PRD 8.2), not editor-managed data like
-- news_categories.
--
-- Ordering is EDITOR-CONTROLLED (display_order), the same as the other content
-- modules. `published_at` is set the first time a row goes live and kept
-- thereafter, matching posts.
-- ============================================================================


-- 1. Download category enum ---------------------------------------------------
create type public.download_category as enum ('result', 'routine', 'form', 'notice');


-- 2. downloads ----------------------------------------------------------------
create table public.downloads (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  file          text not null,                 -- Cloudinary public ID (raw, with extension)
  category      public.download_category not null default 'form',
  display_order integer not null default 0,
  is_published  boolean not null default false,
  published_at  timestamptz,                   -- set when first published
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Public list query is "published, in display order"; index for it.
create index downloads_published_idx
  on public.downloads (is_published, display_order);


-- 3. Row Level Security -------------------------------------------------------
alter table public.downloads enable row level security;

-- Base privileges. anon may only ever SELECT (RLS filters to published);
-- authenticated keeps full base privileges (writes are then gated by policy).
grant select on table public.downloads to anon;
grant select, insert, update, delete on table public.downloads to authenticated;

-- SELECT is split by role so the anon branch NEVER calls
-- current_user_is_active_admin() (anon has no execute on it): anon sees only
-- published rows; an active admin additionally sees drafts.
create policy "downloads_select_public"
on public.downloads for select to anon
using ( is_published = true );

create policy "downloads_select_authenticated"
on public.downloads for select to authenticated
using ( is_published = true or public.current_user_is_active_admin() );

-- Only an active admin may write.
create policy "downloads_insert_admin"
on public.downloads for insert to authenticated
with check ( public.current_user_is_active_admin() );

create policy "downloads_update_admin"
on public.downloads for update to authenticated
using ( public.current_user_is_active_admin() )
with check ( public.current_user_is_active_admin() );

create policy "downloads_delete_admin"
on public.downloads for delete to authenticated
using ( public.current_user_is_active_admin() );


-- 4. updated_at maintained by the database (reuses set_updated_at) ------------
create trigger downloads_set_updated_at
before update on public.downloads
for each row
execute function public.set_updated_at();
