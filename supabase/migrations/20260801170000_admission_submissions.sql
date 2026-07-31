-- ============================================================================
-- Phase 3 — admission_submissions: the admissions pipeline.
--
-- PRD 8.3, 9.4, 9.5, 21.1, 30, Decisions 5, 7a, 8. CLAUDE.md rules 2 & 5.
--
-- THE CENTRAL RULE, same as contact_messages: the public NEVER writes here.
-- Every submission is inserted by a Server Action holding the service-role key,
-- which bypasses RLS — and only AFTER the bot checks pass (PRD 9.4). There is
-- deliberately NO insert policy for anon or authenticated; adding one would
-- reopen a direct write path and make the bot checks decorative.
--
-- This table is ADMIN-ONLY ON BOTH SIDES, which makes it unlike every content
-- module in the project. There is no "published rows are public" half here at
-- all: an applicant cannot read their own submission, because there are no
-- public accounts to own one (Decision 1). They quote their reference number to
-- the office on the phone; that is the whole retrieval mechanism.
--
-- NO `document_file` COLUMN. PRD 8.3 lists one; document upload was dropped
-- from this build deliberately (see the previous migration's header). The
-- column arrives with the upload machinery or not at all.
-- ============================================================================


-- 1. Enums --------------------------------------------------------------------
-- The triage pipeline (Decision 8). An enum rather than the CHECK-constrained
-- text that contact_messages uses: five values across a real workflow earn a
-- type, and the type is what the admin filter's option list is derived from.
create type public.submission_status as enum (
  'new',
  'reviewed',
  'contacted',
  'enrolled',
  'archived'
);

-- The fail-open bot flag (Decision 7a).
--
-- CHECKED FOR REUSE FIRST, as instructed, and it does NOT exist: the
-- contact_messages migration (20260728130000) modelled the same two values as a
-- CHECK constraint on a text column, not as a named type. So this creates the
-- type rather than duplicating one.
--
-- contact_messages is deliberately NOT retrofitted onto it. That would be a
-- destructive alter on a live table holding real leads, bought for tidiness
-- alone — the two columns already agree on the only thing that matters, which
-- is the value vocabulary. If the two ever need to be queried together, convert
-- contact_messages then, as its own reviewed migration.
create type public.verification_state as enum (
  'verified',
  'unverified_review'
);


-- 2. The reference counter (Decision 8) ---------------------------------------
-- `{FORM}-{YEAR}-{sequence}`, e.g. MGMT-2026-00042, and it must NEVER hand the
-- same number to two applicants — the number is what an applicant quotes on the
-- phone, so a collision is two people with one identity.
--
-- A counter table plus an atomic function, rather than a sequence per form-year:
-- a sequence per year would need dynamic DDL at runtime (CREATE SEQUENCE from
-- inside a function, on the first submission of each January), which is a far
-- worse thing to have in a submission path than one extra row.
create table public.admission_reference_counters (
  form_id    text   not null references public.admission_forms (id),
  year       integer not null,
  last_value bigint not null default 0,
  primary key (form_id, year)
);

-- No access for anybody. RLS on with zero policies, and the base grants revoked:
-- this table is touched ONLY by the SECURITY DEFINER function below, which runs
-- as the owner and is therefore unaffected by both.
alter table public.admission_reference_counters enable row level security;
revoke all on table public.admission_reference_counters from anon;
revoke all on table public.admission_reference_counters from authenticated;


-- The allocator. SECURITY DEFINER so it can touch the locked-down counter table
-- while its caller cannot.
--
-- CONCURRENCY: the whole allocation is ONE statement. `insert ... on conflict do
-- update ... returning` takes a row lock on the (form_id, year) row; a second
-- concurrent submission blocks on that lock, then re-reads the committed value
-- and increments it. Two simultaneous applicants cannot read the same
-- last_value. Nothing here is read-then-write in the application.
--
-- One honest limit: if the CALLER's transaction later rolls back, the increment
-- rolls back with it and that number is issued to the next applicant instead.
-- That is a gap-free counter, not a reissued one — the rolled-back submission
-- was never stored and never told anybody its number. (A sequence would behave
-- the opposite way: never reused, but gappy.) The action calls this immediately
-- before a single insert, so the window is one statement wide.
create or replace function public.next_admission_reference(p_form_id text)
returns text
language plpgsql
security definer
-- Pinned search_path: a SECURITY DEFINER function that resolves unqualified
-- names through the caller's search_path is the classic privilege-escalation
-- hole. Every reference below is schema-qualified anyway; this is the belt.
set search_path = public, pg_temp
as $$
declare
  v_prefix text;
  v_year   integer;
  v_next   bigint;
begin
  -- The short code per form. Kept HERE, beside the counter it keys, so a
  -- reference prefix cannot be invented by a caller.
  v_prefix := case p_form_id
    when 'plus_two_management' then 'MGMT'
    when 'plus_two_law'        then 'LAW'
    when 'bbs'                 then 'BBS'
    else null
  end;

  if v_prefix is null then
    raise exception 'next_admission_reference: unknown admission form id %', p_form_id;
  end if;

  -- THE NPT YEAR, not the UTC year. `now()` is timestamptz; shifting it into
  -- Asia/Kathmandu before taking the year is what stops a submission at 23:50
  -- NPT on 31 December being filed under the following year — which is when
  -- UTC (18:05, still the 31st) and Nepal (+05:45) disagree about the date.
  v_year := extract(year from (now() at time zone 'Asia/Kathmandu'))::integer;

  insert into public.admission_reference_counters (form_id, year, last_value)
  values (p_form_id, v_year, 1)
  on conflict (form_id, year)
    do update set last_value = public.admission_reference_counters.last_value + 1
  returning last_value into v_next;

  -- 5 digits: MGMT-2026-00042. lpad only pads — a 100,000th application in one
  -- year would widen to 6 digits rather than wrap, so the format degrades
  -- gracefully instead of colliding. (PRD 1.3 expects nothing near that.)
  return v_prefix || '-' || v_year::text || '-' || lpad(v_next::text, 5, '0');
end;
$$;

-- Only the service client may allocate a reference — it is the only writer of
-- submissions. Functions are executable by PUBLIC by default, which would let
-- any visitor burn reference numbers with repeated RPC calls.
revoke all on function public.next_admission_reference(text) from public;
revoke all on function public.next_admission_reference(text) from anon;
revoke all on function public.next_admission_reference(text) from authenticated;
grant execute on function public.next_admission_reference(text) to service_role;


-- 3. admission_submissions ----------------------------------------------------
create table public.admission_submissions (
  id           uuid primary key default gen_random_uuid(),
  -- UNIQUE is the database's own guarantee behind the counter above: even if
  -- the allocator were ever wrong, two applicants could not both be stored.
  reference    text not null unique,
  form_id      text not null references public.admission_forms (id),
  -- Promoted to columns for a readable admin pipeline (PRD 8.3) — the list
  -- shows these without opening the payload.
  full_name    text not null,
  email        text not null,
  phone        text not null,
  -- Management only; null for Law and BBS.
  --
  -- TEXT, NOT A FOREIGN KEY, and that is the point (Decision 5). The stream a
  -- person applied under is a FACT ABOUT THAT APPLICATION, not a live pointer
  -- at a configuration row. Retiring 'Mountaineering' next year leaves this
  -- application still saying 'Mountaineering', still filterable by it. A FK
  -- would make retirement rewrite history — which is exactly why
  -- management_streams also has no delete path.
  stream       text,
  -- Every other answer. The SHAPE is fixed per form in code
  -- (lib/admission-schemas.ts), not by this column — jsonb is the storage, the
  -- code schema is the contract, and both the renderer and the validator read
  -- that one schema so they cannot drift.
  payload      jsonb not null default '{}'::jsonb,
  status       public.submission_status not null default 'new',
  verification public.verification_state not null default 'verified',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- The admin list's two shapes: the pipeline view (a status, newest first) and
-- the per-form view (one form, newest first).
create index admission_submissions_status_idx
  on public.admission_submissions (status, created_at desc);

create index admission_submissions_form_idx
  on public.admission_submissions (form_id, created_at desc);


-- 4. Row Level Security -------------------------------------------------------
alter table public.admission_submissions enable row level security;

-- anon gets NOTHING — not a policy, not a base privilege. Applicants never read
-- submissions, not even their own (there is no "their own": no public accounts,
-- Decision 1). Revoking removes the surface entirely rather than relying on the
-- absence of a policy.
revoke all on table public.admission_submissions from anon;

-- `authenticated` gets exactly the two operations the admin pipeline performs.
-- Granted, NOT revoked: grants and RLS are ANDed, so revoking the base
-- privilege would make the admin policies below unreachable and raise
-- "permission denied for table" instead of filtering — the bug that
-- 20260728140000 had to fix on contact_messages. The policies do the real
-- restricting; a signed-in non-admin is filtered to zero rows.
grant select, update on table public.admission_submissions to authenticated;

-- Active admins read every submission (PRD 30.4: no ownership — these are
-- staff-only leads).
create policy "admission_submissions_select_admin"
on public.admission_submissions for select to authenticated
using ( public.current_user_is_active_admin() );

-- Active admins advance the triage status and dismiss the unverified flag.
-- The enum types bound WHAT may be written; this policy bounds WHO.
create policy "admission_submissions_update_admin"
on public.admission_submissions for update to authenticated
using ( public.current_user_is_active_admin() )
with check ( public.current_user_is_active_admin() );

-- NO INSERT POLICY FOR ANYONE, and no INSERT grant. Stated explicitly because
-- its absence is the design, not an oversight: the ONLY writer is the service
-- client inside the /apply server action, which bypasses RLS entirely (PRD
-- 9.4, 9.6) and runs only after the bot checks, the published re-check, the
-- schema validation, and the stream-availability check. An admin cannot insert
-- a submission either — nobody hand-files a lead.

-- NO DELETE POLICY. Archiving is a status value, never a row delete.
--
-- Worth being precise about how this differs from the missing DELETE on
-- management_streams. There, it is a HARD STRUCTURAL RULE: deleting a stream
-- would rewrite the meaning of past applications, so the path must not exist.
-- Here, PRD 9.5 states archive-not-delete as an OFFICE PRACTICE — a workflow
-- convention, explicitly "not a database-enforced prohibition". It is enforced
-- at the database anyway, because nothing in this system has any reason to
-- delete a lead, and a convention with no enforcement is a convention someone
-- eventually breaks at 5pm during admission season. If the office ever needs a
-- genuine erasure (a data-protection request, say), that is a deliberate
-- service-role operation, not a button.


-- 5. updated_at maintained by the database (reuses set_updated_at) ------------
-- Load-bearing beyond tidiness here: PRD 8.5 declines a status-history table on
-- the grounds that `status` plus `updated_at` is enough for a lead pipeline, so
-- this trigger IS the audit trail.
create trigger admission_submissions_set_updated_at
before update on public.admission_submissions
for each row
execute function public.set_updated_at();
