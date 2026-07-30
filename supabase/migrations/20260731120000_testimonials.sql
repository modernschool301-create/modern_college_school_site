-- ============================================================================
-- Phase 1 — Testimonials: the second replication of the News public-content
-- pattern (PRD 8.2, 9, 18, 28), copied from `achievements` EXACTLY.
--
-- anon MAY read published rows, so we grant SELECT to anon and filter drafts out
-- with a policy (PRD 9.3); the `authenticated` base grants are KEPT (base grants
-- and RLS are ANDed — revoking would break admin writes) and every write is
-- gated on current_user_is_active_admin(), which reads the role live from
-- profiles.
--
-- `quote` is stored as PLAIN TEXT (NOT markdown, unlike posts.body /
-- achievements.description): a testimonial is a single spoken quote, rendered
-- verbatim on the public page. `programme` is FREE TEXT, not a FK — the
-- programmes table arrives in Phase 2.
--
-- Ordering is EDITOR-CONTROLLED (display_order), the same as achievements — a
-- testimonial's placement is a curation decision, not its recency.
-- ============================================================================


-- 1. testimonials -------------------------------------------------------------
create table public.testimonials (
  id            uuid primary key default gen_random_uuid(),
  student_name  text not null,
  programme     text,                          -- free text, NOT a FK
  quote         text not null,
  photo         text,                          -- Cloudinary public ID, nullable
  display_order integer not null default 0,
  is_published  boolean not null default false,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Public list query is "published, in display order"; index for it.
create index testimonials_published_idx
  on public.testimonials (is_published, display_order);


-- 2. Row Level Security -------------------------------------------------------
alter table public.testimonials enable row level security;

-- Base privileges. anon may only ever SELECT (RLS filters to published);
-- authenticated keeps full base privileges (writes are then gated by policy).
grant select on table public.testimonials to anon;
grant select, insert, update, delete on table public.testimonials to authenticated;

-- SELECT is split by role so the anon branch NEVER calls
-- current_user_is_active_admin() (anon has no execute on it): anon sees only
-- published rows; an active admin additionally sees drafts.
create policy "testimonials_select_public"
on public.testimonials for select to anon
using ( is_published = true );

create policy "testimonials_select_authenticated"
on public.testimonials for select to authenticated
using ( is_published = true or public.current_user_is_active_admin() );

-- Only an active admin may write.
create policy "testimonials_insert_admin"
on public.testimonials for insert to authenticated
with check ( public.current_user_is_active_admin() );

create policy "testimonials_update_admin"
on public.testimonials for update to authenticated
using ( public.current_user_is_active_admin() )
with check ( public.current_user_is_active_admin() );

create policy "testimonials_delete_admin"
on public.testimonials for delete to authenticated
using ( public.current_user_is_active_admin() );


-- 3. updated_at maintained by the database (reuses set_updated_at) ------------
create trigger testimonials_set_updated_at
before update on public.testimonials
for each row
execute function public.set_updated_at();
