-- ============================================================================
-- Phase 1 — News / Events / Notices: the first full CMS module.
--
-- PRD sections 8.2, 9, 10.5, 21. CLAUDE.md rules.
--
-- Public-content pattern (contrast with contact_messages, which is admin-read
-- only): the anon role MAY read PUBLISHED rows here. So we do NOT revoke from
-- anon — we grant SELECT and filter drafts out with a policy (PRD 9.3). We keep
-- base grants for `authenticated` (NOT the earlier revoke-from-authenticated
-- bug) and gate writes on current_user_is_active_admin().
--
-- `body` is stored as MARKDOWN (rendered with react-markdown + remark-gfm on the
-- public detail page). Plain text in the DB, no HTML, so nothing unsafe is
-- stored and the admin editor stays a simple textarea.
-- ============================================================================


-- 1. Post type enum ----------------------------------------------------------
create type public.post_type as enum ('news', 'event', 'notice');


-- 2. news_categories ---------------------------------------------------------
create table public.news_categories (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  display_order integer not null default 0,
  created_at    timestamptz not null default now()
);


-- 3. posts -------------------------------------------------------------------
create table public.posts (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  slug          text not null unique,          -- explicit web address
  type          public.post_type not null default 'news',
  excerpt       text,
  body          text,                          -- markdown
  cover_image   text,                          -- Cloudinary public ID, nullable
  category_id   uuid references public.news_categories (id) on delete set null,
  is_published  boolean not null default false,
  published_at  timestamptz,                   -- set when first published
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Public list query is "published, newest first"; index for it.
create index posts_published_idx
  on public.posts (is_published, published_at desc);


-- 4. Row Level Security ------------------------------------------------------

-- 4a. posts ------------------------------------------------------------------
alter table public.posts enable row level security;

-- Base privileges. anon may only ever SELECT (RLS filters to published);
-- authenticated keeps full base privileges (writes are then gated by policy).
grant select on table public.posts to anon;
grant select, insert, update, delete on table public.posts to authenticated;

-- SELECT is split by role so the anon branch NEVER calls
-- current_user_is_active_admin() (anon has no execute on it): anon sees only
-- published rows; an active admin additionally sees drafts.
create policy "posts_select_public"
on public.posts for select to anon
using ( is_published = true );

create policy "posts_select_authenticated"
on public.posts for select to authenticated
using ( is_published = true or public.current_user_is_active_admin() );

-- Only an active admin may write.
create policy "posts_insert_admin"
on public.posts for insert to authenticated
with check ( public.current_user_is_active_admin() );

create policy "posts_update_admin"
on public.posts for update to authenticated
using ( public.current_user_is_active_admin() )
with check ( public.current_user_is_active_admin() );

create policy "posts_delete_admin"
on public.posts for delete to authenticated
using ( public.current_user_is_active_admin() );

-- 4b. news_categories --------------------------------------------------------
alter table public.news_categories enable row level security;

grant select on table public.news_categories to anon;
grant select, insert, update, delete on table public.news_categories to authenticated;

-- Categories are public metadata: everyone may read all (no draft concept, no
-- function call needed, so one policy covers both roles).
create policy "news_categories_select_all"
on public.news_categories for select to anon, authenticated
using ( true );

create policy "news_categories_insert_admin"
on public.news_categories for insert to authenticated
with check ( public.current_user_is_active_admin() );

create policy "news_categories_update_admin"
on public.news_categories for update to authenticated
using ( public.current_user_is_active_admin() )
with check ( public.current_user_is_active_admin() );

create policy "news_categories_delete_admin"
on public.news_categories for delete to authenticated
using ( public.current_user_is_active_admin() );


-- 5. updated_at maintained by the database (reuses set_updated_at) -----------
create trigger posts_set_updated_at
before update on public.posts
for each row
execute function public.set_updated_at();
