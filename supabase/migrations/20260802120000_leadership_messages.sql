-- ============================================================================
-- Leadership Messages — the homepage's "a word from our leadership" block.
--
-- Structurally this is the achievements/testimonials public-content pattern for
-- the third time, copied EXACTLY: anon may read published rows only, the
-- `authenticated` base grants are KEPT (base grants and RLS are ANDed —
-- revoking them would break admin writes), SELECT is split by role so the anon
-- branch never calls current_user_is_active_admin() (anon has no execute on
-- it), and every write is gated on that function, which reads the role LIVE
-- from profiles.
--
-- What is different from testimonials:
--
--   `title` is FREE TEXT and deliberately unconstrained — no enum, no lookup
--   table. The school decides entirely what a person is called ("Principal",
--   "Chairperson", "Founder & Managing Director"); a fixed list would be wrong
--   within a year and would need a migration to fix a job title.
--
--   `excerpt` is the short statement shown on the card and is REQUIRED — a card
--   with no words on it is not a card.
--
--   `full_message` is MARKDOWN and NULLABLE, and the two facts are load-bearing
--   together: it is the long text the dialog expands to, so a row without one
--   has nothing to expand to and the public card renders NO button at all. That
--   is a content decision the admin makes by leaving the field empty, not a
--   flag they have to also remember to set.
--
-- Ordering is EDITOR-CONTROLLED (display_order): leadership is a hierarchy the
-- school states, never alphabetical and never by recency.
-- ============================================================================


-- 1. leadership_messages ------------------------------------------------------
create table public.leadership_messages (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  title         text not null,                 -- free text; the admin decides
  photo         text,                          -- Cloudinary public ID, nullable
  excerpt       text not null,                 -- shown on the card
  full_message  text,                          -- markdown; null = no dialog
  display_order integer not null default 0,
  is_published  boolean not null default false,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- The only public query is "published, in display order"; index for it.
create index leadership_messages_published_idx
  on public.leadership_messages (is_published, display_order);


-- 2. Row Level Security -------------------------------------------------------
alter table public.leadership_messages enable row level security;

-- Base privileges. anon may only ever SELECT (RLS filters to published);
-- authenticated keeps full base privileges (writes are then gated by policy).
grant select on table public.leadership_messages to anon;
grant select, insert, update, delete on table public.leadership_messages to authenticated;

-- SELECT split by role: anon sees published rows only and never touches the
-- admin function; an active admin additionally sees drafts.
create policy "leadership_messages_select_public"
on public.leadership_messages for select to anon
using ( is_published = true );

create policy "leadership_messages_select_authenticated"
on public.leadership_messages for select to authenticated
using ( is_published = true or public.current_user_is_active_admin() );

-- Only an active admin may write. This is the enforcement behind every hidden
-- control in /admin/leadership: a deactivated or demoted admin who kept a page
-- open and posted the form anyway fails HERE, at the database, because
-- current_user_is_active_admin() re-reads profiles on every statement.
create policy "leadership_messages_insert_admin"
on public.leadership_messages for insert to authenticated
with check ( public.current_user_is_active_admin() );

create policy "leadership_messages_update_admin"
on public.leadership_messages for update to authenticated
using ( public.current_user_is_active_admin() )
with check ( public.current_user_is_active_admin() );

create policy "leadership_messages_delete_admin"
on public.leadership_messages for delete to authenticated
using ( public.current_user_is_active_admin() );


-- 3. updated_at maintained by the database (reuses set_updated_at) ------------
create trigger leadership_messages_set_updated_at
before update on public.leadership_messages
for each row
execute function public.set_updated_at();
