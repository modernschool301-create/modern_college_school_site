-- ============================================================================
-- Phase 1 — Achievements: the first replication of the News public-content
-- pattern (PRD 8.2, 9, 10.5, 19, 28).
--
-- Deliberately the simplest full vertical, so the pattern proven on `posts` is
-- copied here EXACTLY rather than re-invented: anon MAY read published rows, so
-- we grant SELECT to anon and filter drafts out with a policy (PRD 9.3); the
-- `authenticated` base grants are KEPT (base grants and RLS are ANDed — revoking
-- would break admin writes) and every write is gated on
-- current_user_is_active_admin(), which reads the role live from profiles.
--
-- `description` is stored as MARKDOWN, the same convention as posts.body
-- (rendered with react-markdown + remark-gfm on the public page). Plain text in
-- the DB, no HTML, so nothing unsafe is stored and the editor stays a textarea.
--
-- Ordering is EDITOR-CONTROLLED here (display_order), not chronological like
-- news — an achievement's importance is not its recency.
-- ============================================================================


-- 1. achievements -------------------------------------------------------------
create table public.achievements (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,                          -- markdown
  image         text,                          -- Cloudinary public ID, nullable
  achieved_on   date,                          -- when it happened, nullable
  display_order integer not null default 0,
  is_published  boolean not null default false,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Public list query is "published, in display order"; index for it.
create index achievements_published_idx
  on public.achievements (is_published, display_order);


-- 2. Row Level Security -------------------------------------------------------
alter table public.achievements enable row level security;

-- Base privileges. anon may only ever SELECT (RLS filters to published);
-- authenticated keeps full base privileges (writes are then gated by policy).
grant select on table public.achievements to anon;
grant select, insert, update, delete on table public.achievements to authenticated;

-- SELECT is split by role so the anon branch NEVER calls
-- current_user_is_active_admin() (anon has no execute on it): anon sees only
-- published rows; an active admin additionally sees drafts.
create policy "achievements_select_public"
on public.achievements for select to anon
using ( is_published = true );

create policy "achievements_select_authenticated"
on public.achievements for select to authenticated
using ( is_published = true or public.current_user_is_active_admin() );

-- Only an active admin may write.
create policy "achievements_insert_admin"
on public.achievements for insert to authenticated
with check ( public.current_user_is_active_admin() );

create policy "achievements_update_admin"
on public.achievements for update to authenticated
using ( public.current_user_is_active_admin() )
with check ( public.current_user_is_active_admin() );

create policy "achievements_delete_admin"
on public.achievements for delete to authenticated
using ( public.current_user_is_active_admin() );


-- 3. updated_at maintained by the database (reuses set_updated_at) ------------
create trigger achievements_set_updated_at
before update on public.achievements
for each row
execute function public.set_updated_at();
