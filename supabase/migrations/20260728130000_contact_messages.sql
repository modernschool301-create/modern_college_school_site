-- ============================================================================
-- Phase 0.3 — contact_messages: the first public-write target.
--
-- PRD sections 3, 8.3, 9.3, 9.4, 22. CLAUDE.md rules 2 & 5.
--
-- THE CENTRAL RULE (CLAUDE.md rule 2): the public NEVER writes to this table.
-- The anon key is read-only across the whole system and has NO access here at
-- all. Every contact message is inserted by a server Server Action holding the
-- service-role key, which bypasses RLS — and only AFTER the bot checks pass
-- (PRD 9.4). There is deliberately NO insert policy for anon/authenticated;
-- adding one would reopen a direct write path and make the bot checks
-- decorative (PRD 3, contrast note).
-- ============================================================================


-- 1. Table -------------------------------------------------------------------
create table public.contact_messages (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email        text not null,
  message      text not null,
  -- Triage status. CHECK-constrained, not free text, so a bad value can never
  -- be stored. Archiving is a status change, never a row delete (PRD 9.5).
  status       text not null default 'new'
    check (status in ('new', 'read', 'archived')),
  -- Fail-open bot flag (Decision 7a). 'unverified_review' means an ambiguous
  -- check accepted the row rather than dropping a possible real lead.
  verification text not null default 'verified'
    check (verification in ('verified', 'unverified_review')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);


-- 2. Row Level Security ------------------------------------------------------
alter table public.contact_messages enable row level security;

-- Make "no public access" explicit rather than merely implied by the absence
-- of policies. Supabase grants table privileges to anon/authenticated by
-- default; RLS restricts them, but revoking removes the surface entirely.
-- The service-role key is NOT affected by these revokes — it bypasses both
-- grants and RLS, which is exactly how the server insert works.
revoke all on table public.contact_messages from anon;
revoke all on table public.contact_messages from authenticated;

-- NO anon/authenticated policy of any kind: no SELECT, INSERT, UPDATE, DELETE.
-- The public cannot read or write this table. Inserts are server-only via the
-- service key (see header). This is the read-only-public rule (PRD 9.3).

-- Admins may read every message (the /admin/contact-messages inbox).
create policy "contact_messages_select_admin"
on public.contact_messages
for select
to authenticated
using ( public.current_user_is_active_admin() );

-- Admins may advance the triage status (new -> read -> archived). The CHECK
-- constraint above bounds the allowed values; this policy bounds who may write.
create policy "contact_messages_update_admin"
on public.contact_messages
for update
to authenticated
using ( public.current_user_is_active_admin() )
with check ( public.current_user_is_active_admin() );

-- NO DELETE policy for anyone. Messages are archived via status, never
-- deleted (CLAUDE.md data-integrity rule; PRD 9.5).


-- 3. updated_at maintained by the database -----------------------------------
-- Reuses public.set_updated_at() created in the profiles migration.
create trigger contact_messages_set_updated_at
before update on public.contact_messages
for each row
execute function public.set_updated_at();
