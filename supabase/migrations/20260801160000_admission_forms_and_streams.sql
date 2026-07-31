-- ============================================================================
-- Phase 3 (Part 1 prerequisite) — admission_forms and management_streams.
--
-- PRD 8.3, 9.3, 9.5, 21.1, 29, Decisions 4 & 5.
--
-- ┌─ WHY THIS MIGRATION EXISTS ───────────────────────────────────────────────┐
-- │ It is the CONFIGURATION half of admissions, written here only because     │
-- │ `admission_submissions` (the next migration) cannot exist without it: the │
-- │ submissions FK points at admission_forms.id, the server action re-checks  │
-- │ is_published before accepting a write, and the Management stream picker   │
-- │ reads management_streams.                                                 │
-- │                                                                           │
-- │ It is DATA + POLICY ONLY. The /admin/admissions module described at PRD   │
-- │ 29 (publish toggles, heading/description edits, the one-click open/close  │
-- │ +2 convenience, the streams panel with its retire control) is NOT built   │
-- │ here. Until it is, an admin changes these rows by SQL. Every policy that  │
-- │ module will need is already written below, so it is pure UI work.         │
-- └───────────────────────────────────────────────────────────────────────────┘
--
-- NO `upload_enabled` COLUMN. PRD 8.3 lists one, but document upload was
-- dropped from this build deliberately: an upload step is applicant friction,
-- and Decision 7's overriding rule is never to lose a lead. A toggle with no
-- machinery behind it is worse than no toggle — it would read as a working
-- feature to whoever finds it. If the school later wants documents, the column
-- and the real upload/private-delivery machinery arrive together, additively.
-- ============================================================================


-- 1. admission_forms ----------------------------------------------------------
-- Three rows, forever, until a migration says otherwise (Decision 4). The id is
-- a FIXED TEXT KEY, not a uuid, because it is the join between a database row
-- and a field schema that lives in code (lib/admission-schemas.ts) and in the
-- public URL (/apply/plus_two_management). A uuid would put a meaningless token
-- in both places.
create table public.admission_forms (
  -- The CHECK restates the closed set at the database. Adding a fourth form is
  -- deliberately a migration (this constraint + a code schema + a reference
  -- prefix), never a row someone inserts from a UI — which is also why there is
  -- no INSERT policy below.
  id            text primary key
    check (id in ('plus_two_management', 'plus_two_law', 'bbs')),
  -- Editable presentation. The admin owns the words; the code owns the fields.
  title         text not null,
  description   text,
  -- Ships FALSE. Nothing is open until someone opens it, and an unpublished
  -- form is refused by the /apply route AND re-refused by the server action.
  is_published  boolean not null default false,
  -- INFORMATIONAL only (PRD 8.3). Nothing enforces it: a submission arriving
  -- after the deadline is still a lead, and silently rejecting it would be
  -- exactly the lost applicant Decision 7 exists to prevent.
  deadline      date,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- The seeded three (PRD 8.3). Titles and descriptions are workable defaults the
-- admin is expected to rewrite; PRD 33 item 1 still owes us the school's own
-- copy. All three ship UNPUBLISHED.
insert into public.admission_forms (id, title, description, display_order) values
  (
    'plus_two_management',
    '+2 Management',
    'Apply for the +2 Management programme. Choose the stream you want to join, and the admissions office will contact you about the next steps.',
    1
  ),
  (
    'plus_two_law',
    '+2 Law',
    'Apply for the +2 Law programme, run in partnership with Kathmandu School of Law. Seats are limited.',
    2
  ),
  (
    'bbs',
    'BBS',
    'Apply for the Bachelor of Business Studies programme. Tell us about your +2 result and the admissions office will be in touch.',
    3
  );


-- 2. management_streams -------------------------------------------------------
-- SHIPS EMPTY (Decision 5). No seed here, deliberately: the admission in-charge
-- populates the list. Section 21.1's guard is what makes an empty list safe —
-- a published Management form with no available streams shows "admissions
-- opening soon" rather than a broken empty picker.
create table public.management_streams (
  id            uuid primary key default gen_random_uuid(),
  -- UNIQUE, and that interacts with retirement on purpose: because retiring
  -- KEEPS the row, re-offering a stream the school dropped last year is
  -- flipping is_available back to true, not inserting a second row with the
  -- same name. Two rows named 'Computer Science' would make the submissions
  -- filter ambiguous forever.
  name          text not null unique,
  display_order integer not null default 0,
  -- RETIRE, NEVER DELETE (Decision 5). False removes the stream from the
  -- applicant picker immediately while every past submission keeps its stream
  -- label — which it can, because a submission stores the stream as TEXT and
  -- not as a foreign key. The same flag doubles as a temporary open/close.
  is_available  boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- The applicant picker's query is "available, in display order".
create index management_streams_available_idx
  on public.management_streams (is_available, display_order);


-- 3. Row Level Security -------------------------------------------------------
alter table public.admission_forms enable row level security;
alter table public.management_streams enable row level security;

-- Base privileges. Grants and RLS are ANDed — a revoked base privilege makes
-- the policy unreachable and raises "permission denied" rather than returning
-- zero rows (the bug fixed in 20260728140000). So grant exactly the operations
-- each role's UI performs and let the policies do the restricting.
grant select on table public.admission_forms to anon;
grant select, update on table public.admission_forms to authenticated;

grant select on table public.management_streams to anon;
grant select, insert, update on table public.management_streams to authenticated;
-- NOTE what is absent: DELETE is not granted to anyone, at the grant level as
-- well as the policy level. On management_streams that is the one HARD
-- structural rule in the admissions area (PRD 9.5) — there is no delete path
-- for a stream, only retirement.

-- ---- admission_forms policies ----
-- The public sees published forms only. An unpublished form is excluded by
-- policy, not hidden by the page (PRD 9.3).
create policy "admission_forms_select_public"
on public.admission_forms for select to anon
using ( is_published );

-- Split from the anon policy so the anon branch never calls
-- current_user_is_active_admin() (anon has no execute on it) — the shape every
-- other module uses. A signed-in active admin additionally sees drafts.
create policy "admission_forms_select_authenticated"
on public.admission_forms for select to authenticated
using ( is_published or public.current_user_is_active_admin() );

-- An admin edits a form's words, its publish flag, its deadline, its order.
create policy "admission_forms_update_admin"
on public.admission_forms for update to authenticated
using ( public.current_user_is_active_admin() )
with check ( public.current_user_is_active_admin() );

-- NO INSERT and NO DELETE policy for anyone, including admins — the same call
-- as the settings key set. The three forms are this migration's to define; an
-- admin changes what a form SAYS, never which forms exist.

-- ---- management_streams policies ----
-- The public sees available streams only. A retired stream vanishes from the
-- picker by policy.
create policy "management_streams_select_public"
on public.management_streams for select to anon
using ( is_available );

-- An admin sees retired streams too — the streams panel has to show them to
-- offer un-retiring.
create policy "management_streams_select_authenticated"
on public.management_streams for select to authenticated
using ( is_available or public.current_user_is_active_admin() );

create policy "management_streams_insert_admin"
on public.management_streams for insert to authenticated
with check ( public.current_user_is_active_admin() );

-- Covers renaming, reordering, and BOTH directions of the retire flag.
create policy "management_streams_update_admin"
on public.management_streams for update to authenticated
using ( public.current_user_is_active_admin() )
with check ( public.current_user_is_active_admin() );

-- NO DELETE POLICY. Deliberate and load-bearing (Decision 5): hard-deleting a
-- stream would silently rewrite the meaning of applications already made under
-- it. Retirement is a flag flip. Unlike the missing DELETE on submissions
-- (which enforces an office convention), this one is a structural rule.


-- 4. updated_at maintained by the database (reuses set_updated_at) ------------
create trigger admission_forms_set_updated_at
before update on public.admission_forms
for each row
execute function public.set_updated_at();

create trigger management_streams_set_updated_at
before update on public.management_streams
for each row
execute function public.set_updated_at();
