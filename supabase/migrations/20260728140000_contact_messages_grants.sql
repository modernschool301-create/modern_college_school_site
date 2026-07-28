-- ============================================================================
-- Phase 0.3 fix — restore the base SELECT/UPDATE grants on contact_messages
-- for `authenticated`.
--
-- Bug: the previous migration (20260728130000) ran
--   revoke all on table public.contact_messages from authenticated;
-- Base GRANTs and RLS are ANDed: a query must clear the base privilege check
-- FIRST, then RLS filters rows. With the base grant revoked, an authenticated
-- admin never reaches the policy — Postgres raises "permission denied for
-- table contact_messages". (A policy that filtered everything out would instead
-- return zero rows, not error.)
--
-- Fix: give `authenticated` the base SELECT/UPDATE privileges back. The RLS
-- policies from the prior migration still do the real restricting — only an
-- active admin (current_user_is_active_admin()) actually reads or updates; a
-- non-admin authenticated user is filtered to zero rows.
--
-- The security model is unchanged:
--   * anon stays fully revoked — the public gets NOTHING here.
--   * INSERT/DELETE are NOT granted to authenticated — inserts remain
--     server-only via the service key (which bypasses grants + RLS), and there
--     is no delete path anywhere (archiving is a status change).
-- ============================================================================

-- Base privileges for the two operations the admin UI performs. RLS still
-- gates them to active admins via the existing policies.
grant select, update on table public.contact_messages to authenticated;

-- Belt-and-suspenders: ensure the public role still has no access at all.
revoke all on table public.contact_messages from anon;
