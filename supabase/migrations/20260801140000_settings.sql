-- ============================================================================
-- Phase 2 — Settings: the site-wide key/value store (PRD 8.4, 11, 30.1,
-- Decision 12).
--
-- A key/value table rather than a one-row typed table because the set of
-- settings is small, unrelated, and grows by addition: homepage statistics, the
-- office notification address, and the homepage pop-up singleton. Decision 12 is
-- why the pop-up lives HERE and not in a table of its own — there is only ever
-- one homepage pop-up, so a table would be a table of one row forever.
--
-- ┌─ THIS TABLE IS NOT UNIFORMLY PUBLIC ──────────────────────────────────────┐
-- │ Every other public table in this project is "published rows are public",  │
-- │ one rule for the whole table. This one is MIXED, and that is the single   │
-- │ most important thing about it:                                            │
-- │                                                                           │
-- │   • The statistics and the pop-up fields are DISPLAY VALUES. The homepage │
-- │     renders them to anonymous visitors, so anon must read them.           │
-- │   • office_notification_email is the school office's INBOX ADDRESS. It is │
-- │     never displayed anywhere. Publishing it hands a scraper a verified,   │
-- │     staffed address — exactly the kind of leak a marketing site should    │
-- │     not have.                                                             │
-- │                                                                           │
-- │ So the anon SELECT policy is an explicit ALLOWLIST of public keys, NOT    │
-- │ `using (true)`. A blanket policy would expose the office address the day  │
-- │ it was written, silently, with nothing in the UI to reveal it.            │
-- │                                                                           │
-- │ The allowlist is a DENY-BY-DEFAULT list: a key added to this table later  │
-- │ is private until someone deliberately adds it here. That is the correct   │
-- │ direction to fail — a new setting that should have been public renders    │
-- │ blank and gets noticed, whereas a new secret that should have been        │
-- │ private leaks and does not.                                               │
-- └───────────────────────────────────────────────────────────────────────────┘
--
-- The KEY SET IS FIXED BY THIS MIGRATION. There is no INSERT and no DELETE
-- policy for anyone, including admins: an admin edits the VALUE of a setting,
-- never invents a key. A typo'd key inserted from the admin UI would be a row
-- the code never reads and no one ever notices; a deleted key would break a
-- reader. New settings arrive by migration, alongside the code that reads them.
-- ============================================================================


-- 1. settings -----------------------------------------------------------------
create table public.settings (
  key        text primary key,
  -- Deliberately TEXT for every setting, including the numbers and the boolean.
  -- The statistics are displayed verbatim ('1,200+', '30+') so the suffix is
  -- part of the value, not decoration added by the page; and popup_is_active is
  -- read as the string 'true'. One column type keeps the store genuinely
  -- generic — a typed column per setting is the table this deliberately is not.
  value      text,
  updated_at timestamptz not null default now()
);


-- 2. Seed the fixed key set ---------------------------------------------------
-- Empty values, not sample data: an unconfigured statistic must fall back to the
-- figure in the code rather than render a placeholder to the public. The pop-up
-- ships OFF ('false'), so no announcement can appear before someone deliberately
-- turns one on.
insert into public.settings (key, value) values
  ('stat_teachers',            ''),
  ('stat_students',            ''),
  ('stat_years',               ''),
  ('office_notification_email', ''),
  ('popup_image',              ''),
  ('popup_is_active',          'false'),
  ('popup_link_url',           ''),
  ('popup_alt_text',           '');


-- 3. Row Level Security -------------------------------------------------------
alter table public.settings enable row level security;

-- Base privileges. Note what is NOT granted: nobody gets INSERT or DELETE, at
-- the grant level as well as the policy level. The key set is this migration's
-- to define.
grant select on table public.settings to anon;
grant select, update on table public.settings to authenticated;

-- THE PUBLIC ALLOWLIST (see the header box). Every key here is rendered on the
-- homepage to anonymous visitors. office_notification_email is deliberately
-- absent and must stay absent.
create policy "settings_select_public"
on public.settings for select to anon
using (
  key in (
    'stat_teachers',
    'stat_students',
    'stat_years',
    'popup_image',
    'popup_is_active',
    'popup_link_url',
    'popup_alt_text'
  )
);

-- A signed-in user sees the same public keys; an ACTIVE ADMIN additionally sees
-- the private ones. Split from the anon policy so the anon branch never calls
-- current_user_is_active_admin() (anon has no execute on it), the same shape
-- every other module uses.
create policy "settings_select_authenticated"
on public.settings for select to authenticated
using (
  key in (
    'stat_teachers',
    'stat_students',
    'stat_years',
    'popup_image',
    'popup_is_active',
    'popup_link_url',
    'popup_alt_text'
  )
  or public.current_user_is_active_admin()
);

-- Only an active admin may change a value. UPDATE is the ONLY write policy on
-- this table by design — with no INSERT or DELETE policy, an admin can change
-- what a setting says but cannot add or remove settings.
create policy "settings_update_admin"
on public.settings for update to authenticated
using ( public.current_user_is_active_admin() )
with check ( public.current_user_is_active_admin() );


-- 4. updated_at maintained by the database (reuses set_updated_at) ------------
create trigger settings_set_updated_at
before update on public.settings
for each row
execute function public.set_updated_at();
