-- ============================================================================
-- Phase 2 — Scholarships: the third replication of the News public-content
-- pattern (PRD 8.2, 16, 28), copied from `testimonials` EXACTLY.
--
-- anon MAY read published rows, so we grant SELECT to anon and filter drafts out
-- with a policy (PRD 9.3); the `authenticated` base grants are KEPT (base grants
-- and RLS are ANDed — revoking would break admin writes) and every write is
-- gated on current_user_is_active_admin(), which reads the role live from
-- profiles.
--
-- This module has NO media column: PRD 8.2 defines scholarships as title,
-- description, criteria, display_order, is_published only. Nothing here touches
-- Cloudinary, and no upload purpose is added.
--
-- `description` and `criteria` are both MARKDOWN (like achievements.description,
-- unlike testimonials.quote): a scholarship entry is editorial prose that wants
-- lists and emphasis — "who can apply" is naturally a bulleted list.
--
-- Ordering is EDITOR-CONTROLLED (display_order), the same as achievements and
-- testimonials — placement is a curation decision, not recency.
-- ============================================================================


-- 1. scholarships -------------------------------------------------------------
create table public.scholarships (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,                          -- markdown
  criteria      text,                          -- markdown
  display_order integer not null default 0,
  is_published  boolean not null default false,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Public list query is "published, in display order"; index for it.
create index scholarships_published_idx
  on public.scholarships (is_published, display_order);


-- 2. Row Level Security -------------------------------------------------------
alter table public.scholarships enable row level security;

-- Base privileges. anon may only ever SELECT (RLS filters to published);
-- authenticated keeps full base privileges (writes are then gated by policy).
grant select on table public.scholarships to anon;
grant select, insert, update, delete on table public.scholarships to authenticated;

-- SELECT is split by role so the anon branch NEVER calls
-- current_user_is_active_admin() (anon has no execute on it): anon sees only
-- published rows; an active admin additionally sees drafts.
create policy "scholarships_select_public"
on public.scholarships for select to anon
using ( is_published = true );

create policy "scholarships_select_authenticated"
on public.scholarships for select to authenticated
using ( is_published = true or public.current_user_is_active_admin() );

-- Only an active admin may write.
create policy "scholarships_insert_admin"
on public.scholarships for insert to authenticated
with check ( public.current_user_is_active_admin() );

create policy "scholarships_update_admin"
on public.scholarships for update to authenticated
using ( public.current_user_is_active_admin() )
with check ( public.current_user_is_active_admin() );

create policy "scholarships_delete_admin"
on public.scholarships for delete to authenticated
using ( public.current_user_is_active_admin() );


-- 3. updated_at maintained by the database (reuses set_updated_at) ------------
create trigger scholarships_set_updated_at
before update on public.scholarships
for each row
execute function public.set_updated_at();
