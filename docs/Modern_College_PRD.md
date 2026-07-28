# Final PRD — Modern College & School Website

**Product Requirements Document & System Logic Map**
Srijananagar, Bhaktapur Municipality-1, Bhaktapur

Prepared as the authoritative pre-development and build reference for the redesign of **modern.edu.np**. This document supersedes all earlier drafts and conversations.

> **Revision 2.** This revision incorporates decisions made as the build began. Changes from Revision 1: the staff authentication architecture is now fully specified (Sections 9.1–9.2); the DNS and go-live cutover plan is documented with its email-preservation trap (Section 31.5); the development email approach (Resend onboarding domain + `RESEND_FROM` env var) is recorded (Decision 2, Section 10.8); the actual scaffolded stack and repository conventions are noted (Section 5, Section 10.9); and several previously-open items in Section 33 are now resolved (first admin, dates, language, bot approach). The core product design is unchanged.

---

## How to Read This Document

**Part I (Sections 1–7)** describes what the system is, who may do what, and why each significant decision was made. It is the part to bring to a management meeting.

**Part II (Sections 8–10)** specifies the data model, the security model, and the shared infrastructure that governs every page. It is written for whoever builds and later maintains the system.

**Part III (Sections 11–30)** breaks down every page and endpoint, using a consistent five-part structure: route and visibility, user experience, frontend behaviour, backend behaviour, and security constraints.

**Part IV (Sections 31–34)** covers operations, the go-live cutover, the build sequence, and the items still requiring a decision from the school.

Decisions taken once and applied in many places are stated once, in Section 6, and referenced rather than re-argued on each page. The operating rules that govern how the code is built are kept in `CLAUDE.md` at the repository root; this document is the *spec*, that file is the *working discipline*, and the two are deliberately kept separate so they do not drift.

---

# PART I — FOUNDATIONS

## 1. Purpose and Scope

Modern College & School is an established institution in Bhaktapur (founded 2050 B.S. / 1993 A.D., motto "Education for Peace and Prosperity"). Its current website is a WordPress/Elementor build that was compromised in a security incident. This project replaces it with a modern, fast, and maintainable web presence whose two jobs are:

1. **Present the institution well.** A prospective student or parent should form an accurate, favourable impression — programmes, faculty, facilities, achievements, and student voices — on a site that loads fast and looks current on a phone.
2. **Convert visitors into applicants.** The admission enquiry forms are the site's primary conversion action, and every design decision that touches them is settled in their favour: *the school should never lose a lead to friction or a technical failure.* Where that principle conflicts with tidiness — for example, whether to reject a submission that fails an automated check — this document chooses the lead, and says so explicitly.

Unlike a civic accountability system, this site holds no public record that must be protected from its own operators. Its content is promotional, its submissions are private leads reviewed by staff, and nothing a visitor submits ever appears publicly or triggers an automated public action. This materially simplifies the security model (Section 9).

### 1.1 In Scope

Public marketing site with: homepage · programme pages with editable faculty and subject content · about/leadership/executive-board pages · admission procedure · scholarships · learning process · student's voice (testimonials) · achievements · gallery · news/events/notices · downloads/resources (PDFs) · contact · admission enquiry forms with file upload and a staff-reviewed submission pipeline · a complete staff administration area (CMS).

### 1.2 Explicitly Out of Scope for This Build

Public user accounts of any kind · applicant login or application-status tracking · online payment · SMS · document issuance · online examination or results lookup · a student/parent portal · a learning-management system · integration with any external registry · a mobile application · multilingual content (the site is English-only, per Decision 3).

Any future interactive service that needs public accounts — programme registration, a student portal, a complaints channel — will be built as a **separate application on a subdomain** (for example `portal.modern.edu.np`) and linked from this site with a button. It will not share this codebase (Decision 1). This is a deliberate architectural boundary, not a deferral.

### 1.3 Expected Scale

A single institution. Content volume is in the low hundreds of rows per table. Admission submissions arrive in bursts during admission season and are otherwise light. Concurrent visitors are in the tens, spiking around results and admission announcements. Several decisions here are correct at this scale and would be wrong at a multi-campus or national scale; each is marked with the condition under which it should be revisited.

## 2. Roles and Permissions

**Two roles only.**

| Role | Who | How Assigned |
| --- | --- | --- |
| Guest | Any visitor, never signed in | Default and only state for the public |
| Admin | School/college staff managing content | Only by an existing Admin, through the Users page — or seeded directly for the very first account |

There is no self-signup anywhere in this system. A Guest has no account and no path to obtain one. Every Admin account is created by another Admin. This is the single most important access fact in the build: **role assignment is the only door to power, and that door is held only by people who already hold it.**

### 2.1 What Each Role May Do

**Guest** may read all published public content and may submit the public forms — admission enquiries and the contact message. A Guest submits *through the server*, never directly to the database (Section 9), and holds no credentials of any kind.

**Admin** may do everything a Guest may do, plus: manage all content across every module (news, gallery, programmes, achievements, testimonials, scholarships, downloads, homepage statistics), configure admission forms and their toggles, manage the dynamic Management stream list, read and progress admission submissions and contact messages, edit site settings, and create or deactivate other Admin accounts.

For this build there is exactly one privileged role and no internal tiering within it. A future Editor tier — able to post news and gallery content but not touch settings, admissions, or user management — is a clean addition, because the role is stored as an **enum** (not a boolean) and every access check routes through one role-reading function (Section 9.1); adding a tier is a new enum value plus a few policy branches, not a rewrite. It is not built now.

### 2.2 Deactivation, Not Deletion, of Accounts

An Admin account may be deactivated by another Admin. A deactivated account cannot sign in and cannot write. It is not destroyed, and deactivation is reversible. An Admin cannot deactivate their own account or remove their own admin status — the system will not let the school lock itself out of its own administration. Because enforcement reads the role live from the database (Section 9.2), deactivation takes effect on the account's very next action.

## 3. The Enforcement Model

This is the most important technical concept in the document, and it is stated once here rather than repeated on every page. It differs from the pattern used in a resident-account system, and understanding why is worth two minutes.

**The public can read the database, but can never write to it directly. Every public write goes through the server.**

Because Guests have no account, no session, and no database credentials, the only key their browser could ever hold is the public (anonymous) key — and in this system **that key is granted read access to published content and nothing else.** It cannot insert, update, or delete any row in any table.

Every public submission — an admission enquiry, a contact message — is therefore sent to a **Next.js Server Action / route handler** that runs on the server, holds the privileged service key (which never reaches the browser), performs the bot-protection checks (Section 10.4), and only then writes the row. There is exactly one write path into public-submitted data, and it is on the server, behind the checks.

Three layers exist, and the meaning of "authoritative" is precise:

- **Layer 1 — Middleware.** Runs before admin pages load. Confirms a valid, active staff session exists and redirects anyone without one to `/login`. It gates exactly `/admin/:path*` and `/account/:path*` and nothing else; public pages are open to all. Middleware checks **session only**, not role (Section 9.2).
- **Layer 2 — Admin layout & live role check.** The `/admin` layout confirms the session belongs to an **active Admin**, reading the role **live from the `profiles` table**, and redirects otherwise. The public site never shows admin controls to a Guest.
- **Layer 3 — Row Level Security (RLS) in PostgreSQL.** Every table carries policies. The public role may `SELECT` only published rows of public content tables, and may write **nothing, anywhere**. The Admin role's writes are permitted by policy. These policies run inside the database, beneath the website, and cannot be bypassed by inspecting the site in a browser.

The practical consequence that governs the whole build: **hiding a control is never a security measure.** A restriction exists only if a database policy enforces it. And the reason the public submission forms are safe is not that the browser is polite — it is that the anonymous key cannot write, so the server route is the only door, and the bot checks sit in that doorway.

> **Contrast worth recording for maintainers.** In an account-based civic system, signed-in users hold tokens and can hit the database directly, so a website-side bot check is worthless and RLS must do everything. Here the opposite holds: there are no public accounts, the anonymous key is read-only, and so a server-side bot check is *genuine, un-bypassable* protection. Do not "simplify" this later by letting the browser insert submissions with the anon key — that would reintroduce a direct write path and render every bot check decorative.

## 4. Language and Dates

The site is **English-only** (Decision 3). There is no language toggle, no parallel-field storage, and no machine translation anywhere. Content is authored once, in English.

All timestamps are stored timezone-aware and rendered in **Nepal Standard Time (UTC+05:45)**. The 45-minute offset is not cosmetic: naive handling shows the wrong day for anything recorded between 18:15 and midnight local time. All displayed dates use the **Gregorian** calendar (Decision 3) — there is no Bikram Sambat rendering in this build.

### 4.1 Typeface

The site specifies a clean, modern typeface with a well-defined display/body pairing chosen during design. Because content is English-only, full Devanagari coverage is not a hard requirement — but the institution's name and occasional proper nouns may appear in Nepali script within images or copy, so a fallback with Devanagari coverage (for example Noto Sans Devanagari) is included to avoid empty boxes where such text appears.

## 5. Technology Stack

| Layer | Choice | Notes |
| --- | --- | --- |
| Application framework | Next.js 16 (App Router) + TypeScript | Server-rendered; public writes via Server Actions / route handlers |
| UI | React 19 + Tailwind CSS v4 | Current major versions; note minor App Router / Tailwind syntax differences from older projects |
| Database & authentication | Supabase (PostgreSQL) | RLS enforces the read-only-public rule; auth is for staff only |
| Media storage & delivery | Cloudinary | Two delivery modes — see Decision 6. PDF delivery has been enabled on the account |
| Transactional email | Resend | Dev via the Resend onboarding domain; production via a verified subdomain — see Decision 2 and Section 10.8 |
| Bot protection | Honeypot + timing trap + per-IP rate limiting | No third-party challenge widget at launch — see Decision 7 |
| Maps | Static Google Maps embed (as today) | Find-us only; low stakes |
| Hosting | Vercel | Deployed at go-live; local dev runs against the live cloud services until then (Section 10.9) |
| Source control | GitHub, **private** repository | Handles applicant PII; the college's GitHub account is a collaborator |

The stack mirrors the team's prior project closely, so most techniques are already proven — with two deliberate exceptions: the bot-protection approach is *lighter* here (Decision 7), and the framework/UI versions are newer, so a few App Router and Tailwind v4 details differ from older code and should not be assumed identical when patterns are carried across.

## 6. Decisions and Rationale

Every decision below is applied throughout the document and not re-argued on the pages it affects.

**Decision 1 — No public accounts. Any future interactive portal is a separate subdomain application.**
This build has exactly two roles (Guest, Admin) and no self-signup. The entire account subsystem a resident-facing service would need — signup, email verification, public session handling — is absent, because nothing a visitor does here requires an identity. If the institution later wants programme registration, a student portal, or a grievance channel, that is a distinct application with a distinct risk profile, built at `portal.modern.edu.np` and linked with a button. Keeping the two apart prevents a marketing site and an account-holding service from sharing a codebase and a blast radius.

**Decision 2 — Email is sent through Resend, with a development domain now and a verified subdomain at go-live.**
Supabase's default sender is capped and delivers only to pre-authorised addresses; relying on it would let staff password resets and office notifications fail silently. Resend's free tier (3,000/month, 100/day) is comfortably sufficient. The sending identity is handled in two stages so that email can be built and proven *before* the domain is cut over:

- **During development:** email is sent from Resend's shared onboarding domain (`onboarding@resend.dev`), which works immediately with no DNS. In this mode Resend only delivers to the account owner's verified address — which is exactly what is wanted while testing, since the developer is also the seeded first admin.
- **At go-live:** a verified sending subdomain (`mail.modern.edu.np`) is configured in DNS (Section 31.5), and the from-address flips to something like `admissions@mail.modern.edu.np`.

The from-address is never hardcoded; it lives in the `RESEND_FROM` environment variable so the switch at go-live is a one-line change (Section 10.8).

**Decision 3 — The site is English-only, Gregorian dates.**
The institution's audience and existing content are predominantly English. Parallel bilingual storage doubles authoring effort for content that changes constantly; it is not justified here. Every text field is single, not paired.

**Decision 4 — Three admission forms, modelled as rows; fields fixed in code; per-form and per-stream open/close.**
The institution admits at two levels (+2 and Bachelor) across programmes whose *fields differ*. Each admission form is a **row** in an `admission_forms` table carrying its own publish toggle, upload-enabled toggle, editable heading/description, and optional (informational) deadline. The form's actual fields are fixed in code, keyed by the form's id — there is no dynamic form-builder, which would be high-effort, high-risk flexibility the school does not need. Because forms are rows, "publish all / some / none" is just toggling rows, and adding a form later is a row plus a code schema, not new plumbing.

The three seeded forms are **+2 Management**, **+2 Law**, and **BBS**. Law is a separate form from Management even though the two open in the same admission season — because Law's fields differ (its Kathmandu School of Law partnership, its distinct course structure) *and* because separating them lets Law close early when its limited seats fill without disturbing Management. Same-season opening is achieved by publishing two rows on the same day, not by merging them; a one-click "open/close +2 admissions" convenience toggles Management and Law together while each remains independently reachable.

**Decision 5 — Management streams are an admin-managed list; retire, never delete.**
The +2 Management form asks the applicant which stream they want (Business Studies, Computer Science, Hotel Management, Travel & Tourism, Mountaineering, and so on), and this list changes year to year. The *field* ("which stream?") is fixed in code; its *options* are data the Admin edits. Adding next year's stream is an Admin adding a row, no developer.

Removing a stream means **retiring it, not deleting it**: an `is_available` flag hides it from the applicant picker immediately, while every past submission keeps its stream label intact (stored as text) and remains filterable by it. Hard-deleting a stream would silently rewrite the meaning of applications already made under it. The same flag doubles as a temporary open/close.

**The Management stream list ships empty.** No streams are seeded; the admission in-charge populates the list before publishing the Management form. The system guards against a published-but-empty Management form (Section 21.1): rather than render a broken empty picker, it shows an "admissions opening soon" state and warns the Admin.

**Decision 6 — All uploads are signed; delivery type (public or private) is decided by the server, per purpose.**
Signing an upload controls *who may put a file into the account*; delivery type controls *who may look at it once there*. These are independent. Every upload is signed. The server maps each upload purpose to a fixed configuration (folder, formats, size limit, delivery type) — the browser cannot influence it.

| Content | Delivery | Why |
| --- | --- | --- |
| Gallery photos, news images, achievement images, testimonial photos, faculty images | Public | Intended for public view |
| Admission submission documents (marksheets, citizenship, photos) | Private | Personally identifying material; admin-only |
| Downloads (results, routines, forms as PDFs) | Public | Intended for public download |

Public images are served through a **resizing transformation**, not as originals — which strips embedded GPS metadata from phone photos and protects the media quota. Private documents are viewable only through a **short-lived signed link generated at the moment of viewing**, issued only to a signed-in Admin (Section 10.3).

**Decision 7 — Bot protection is a lightweight, invisible stack: honeypot + timing trap + per-IP rate limiting. No challenge widget at launch.**
The entire cost of a bot getting through is *one junk row in an admin-reviewed pipeline* — nothing a visitor submits ever appears publicly or triggers an automated action. The bar is therefore "keep the inbox usable without ever risking a real lead," not "stop every bot." Three invisible measures meet that bar with essentially zero false-rejection risk:

- **Honeypot** — a decoy field hidden from people, filled by naive bots; a filled honeypot is rejected silently. Named and marked `autocomplete="off"` so password managers and autofill don't populate it and flag a real person.
- **Timing trap** — submissions arriving implausibly fast (under a couple of seconds from render) are rejected. The threshold is set **generously** — the institution's explicit priority is never to lose a lead, so this trap catches only the obviously automated.
- **Per-IP rate limiting** — caps how much any single source can push through, and is the *only* one of the three that also protects the anonymous upload endpoint (Section 10.3) from being used to burn the Cloudinary quota. This one is load-bearing; the other two are cheap force-multipliers on top of it.

The posture on verification failure is **fail-open with a flag** (Decision 7a): if a check is ambiguous, the submission is accepted and tagged `unverified_review` rather than dropped, so the worst case for a real applicant is a two-second dismissal by staff, never a silently lost lead. A challenge widget (Cloudflare Turnstile, or the self-hosted open-source Altcha) remains a documented, ready-to-add upgrade **if** reviewed spam ever exceeds a level staff find tolerable. It is not built now.

**Decision 8 — Admission submissions are a staff-reviewed pipeline with a triage status and an office email on arrival.**
Each submission carries a status advancing **New → Reviewed → Contacted → Enrolled → Archived** (with Archived reachable at any point), so the admin list is a working pipeline rather than an undifferentiated inbox. Every new submission emails the office via Resend. Each submission is given a readable reference number of the form `{FORM}-{YEAR}-{sequence}` (for example `MGMT-2026-00042`) generated by a database counter that never reissues a number, so an applicant can be told a reference that means something over the phone.

**Decision 9 — Programme faculty and stream lists are structured, editable data; curriculum tables are relatively stable content.**
Faculty turns over and streams change yearly, so both are modelled as editable rows an Admin manages without a developer. Subject/curriculum tables are set by the examination board and change rarely; they live as structured content within the programme page and are edited when the syllabus actually changes.

**Decision 10 — Static-in-code pages for stable prose; CMS for everything that updates.**
About Us (including Principal's and Chairman's messages and the Executive Board), the Learning Process, the Admission Procedure prose, Contact details, and the Privacy page are stable and live in code. Everything the institution updates regularly is CMS-managed. The dividing line is rate of change, not importance.

**Decision 11 — A backup strategy is required before launch.**
The free database tier includes no automated backups and pauses a project after roughly a week of inactivity. For a site holding real admission leads during season, neither is acceptable. Before launch the institution either funds the paid tier (daily backups, no pausing) or commits to a scheduled, tested export with a stated acceptable data-loss window. This is a budget decision, listed in Section 33.

**Decision 12 — The homepage pop-up is a single-image announcement, not a builder.**
The school supplies a pre-designed banner image and wants it shown as a dismissible pop-up on the homepage. This is deliberately NOT a pop-up builder: no text editor, layout control, or rich content — just one uploaded image, an optional click-through link, and an on/off toggle. It is modelled as a singleton (only ever one active homepage pop-up), stored in the settings store, and managed on the Settings page. The banner is public content, served through a resizing transformation like every other public image (Decision 6), and is the lowest-risk content in the system. A general pop-up system was rejected as flexibility the school does not need.

## 7. What This System Deliberately Does Not Do

- It does **not** create public accounts, log applicants in, or let them track an application. A future portal does that, separately (Decision 1).
- It does **not** take payment.
- It does **not** issue documents, admit letters, or results. An applicant applies here and is contacted by the office.
- It does **not** send SMS. Email only.
- It does **not** verify that a submitted document is genuine.
- It does **not** publish anything a visitor submits. All submissions are private, staff-reviewed leads.
- It does **not** guarantee that every automated bot is stopped (Decision 7) — it guarantees that a real applicant is never turned away, and that bot noise is bounded and reviewed.

---

# PART II — SYSTEM ARCHITECTURE

## 8. Data Model

Roughly seventeen tables and a small settings store. Every table has `created_at`; editable tables also have `updated_at`, refreshed by the database, not the application.

### 8.1 Accounts

**profiles** — one row per staff account. There is **no signup trigger** on `auth.users`, because there is no public signup. The first row is seeded by hand (Section 9.2); every later row is created from the Users page by an existing Admin.

| Field | Notes |
| --- | --- |
| `id` | uuid, references `auth.users(id)` on delete cascade |
| `email` | For staff-page display and login identity |
| `full_name` | Editable by the account holder |
| `role` | Enum, currently the single value `admin`, default `admin`. Kept as an enum (not a boolean) so a future tier is an added value, not a refactor |
| `is_active` | Defaults true. False blocks sign-in and all writes |
| `created_at`, `updated_at` | `updated_at` maintained by a database trigger |

### 8.2 Public Content

**news_categories** — `name`, `display_order`.

**posts** — `title`, `slug`, `type` (news / event / notice), `excerpt`, `body`, `cover_image`, `category_id`, `is_published`, `published_at`, `created_by`. One table serves news, events, and notices, distinguished by `type` and filterable. `slug` stored explicitly for the web address.

**gallery_albums** — `slug`, `title`, `cover_photo`, `display_order`, optional `event_date`.

**gallery_photos** — `album_id`, `photo_file`, `caption`, `display_order`.

**achievements** — `title`, `description`, `image`, `achieved_on`, `display_order`, `is_published`.

**testimonials** — `student_name`, `programme`, `quote`, `photo`, `display_order`, `is_published`.

**scholarships** — `title`, `description`, `criteria`, `display_order`, `is_published`.

**downloads** — `title`, `description`, `file`, `category` (Result / Routine / Form / Notice), `display_order`, `is_published`, `published_at`. Public delivery.

**programmes** — `slug`, `title`, `level` (Secondary / +2 / Bachelor), `intro`, `body`, `is_published`, `display_order`.

**programme_faculty** — `programme_id`, `name`, `qualification`, `photo` (optional), `display_order`. The frequently-changing faculty lists, editable as rows.

### 8.3 Admissions

**admission_forms** — `id` (fixed text key: `plus_two_management`, `plus_two_law`, `bbs`), `title`, `description`, `is_published`, `upload_enabled`, `deadline` (nullable, informational), `display_order`. Toggles and presentation only; fields fixed in code per id (Decision 4).

**management_streams** — `id`, `name`, `display_order`, `is_available`. Admin-managed, ships **empty** (Decision 5). `is_available = false` retires a stream without deleting it. Only the +2 Management form reads this table.

**admission_submissions** —

| Field | Notes |
| --- | --- |
| `reference` | Readable reference, database counter, never reissued (Decision 8) |
| `form_id` | Which admission form |
| `full_name`, `email`, `phone` | Promoted to columns for a readable admin pipeline |
| `stream` | Chosen Management stream **as text**, so it survives that stream being retired. Null for Law/BBS |
| `payload` | The remaining form answers, shape fixed per form in code |
| `document_file` | Optional; private delivery |
| `status` | New / Reviewed / Contacted / Enrolled / Archived (Decision 8) |
| `verification` | `verified` or `unverified_review` — the fail-open flag (Decision 7a) |
| `created_at` | Submission time (NPT) |

**contact_messages** — `name`, `email`, `message`, `status` (New / Read / Archived), `created_at`. Same public-write path and bot protection as admissions.

### 8.4 Settings

**settings** — a small key/value store for: homepage statistics (`stat_teachers`, `stat_students`, `stat_years`), the office notification email address(es), and site-wide toggles. Editable by Admin on the Settings page.

The homepage pop-up singleton is held here as well: `popup_image` (Cloudinary reference), `popup_is_active` (boolean, default false), `popup_link_url` (optional click-through target), and `popup_alt_text` (accessibility). Because there is only ever one homepage pop-up, it needs no table of its own.

### 8.5 What There Is No Table For

There is no public-facing counter, dashboard, tracker, or aggregate view — this is a marketing site, not an accountability system. There is no status-history table for submissions in this build: a lead pipeline is adequately served by `status` plus `updated_at`. A full append-only history is a clean later addition if the office ever wants an audit trail; it is not required now.

## 9. Security Model

The model is deliberately simple because the risk surface is small: read-only public, server-mediated writes, admin-only everything else.

### 9.1 The Role Function

Every "may this staff member do this?" check routes through **one dedicated `SECURITY DEFINER` function, `current_user_is_active_admin()`**, which reads the current user's row from `profiles` and returns true only if `role = 'admin'` and `is_active = true`. It runs with elevated rights so it is **not** itself subject to the policies it informs — which is what prevents an infinite-recursion loop when a policy on `profiles` needs to ask `profiles` about the current user's role. Every policy that needs a role check calls this one function. Written once, used everywhere. It reads live from the table, never from the sign-in token.

### 9.2 Staff Authentication & the Live Role Check

- **No signup, anywhere.** There is no signup route and no trigger creating profiles from `auth.users`. The `profiles` table has no INSERT policy for `anon` or `authenticated` users and no DELETE policy for anyone.
- **The first admin is seeded by hand.** One `auth.users` record is created in the Supabase dashboard (initially the developer's own email, so the whole login/reset flow can be proven on a real inbox), and a matching `profiles` row is inserted by SQL with `role = 'admin'`, `is_active = true`. This is done manually because no existing admin exists to authorise it. The real `@modern.edu.np` administrators are added later from the Users page.
- **The live role check is load-bearing.** Middleware confirms only that a session exists (gating `/admin/:path*` and `/account/:path*`). The `/admin` layout then confirms `current_user_is_active_admin()` by reading `profiles` **live on every request**, never trusting the role embedded in the session/JWT. This is what makes a deactivation or demotion take effect on the account's next action rather than up to an hour later when the token would refresh.
- **profiles policies.** SELECT: a user may read their own row; an active admin may read all. UPDATE: a user may change only their own `full_name` — never their own `role`, `is_active`, `email`, or `id`. The admin-edits-anyone policy (roles and active status) lives only on the Users page (Section 30.1) and is written against `current_user_is_active_admin()`.

### 9.3 The Read-Only-Public Rule

The anonymous role is granted `SELECT` on **published rows** of public content tables and nothing else — no `INSERT`, `UPDATE`, or `DELETE` on any table, ever. Unpublished drafts are excluded by policy, not hidden by the page. This single rule is what makes the server the only write door for the public.

### 9.4 Server-Mediated Submissions

Admission enquiries and contact messages are written by a **server route holding the service key**, which: runs the bot-protection checks (Section 10.4); on an ambiguous check accepts the row with `verification = unverified_review` rather than dropping it; validates the answers against the form's code-defined schema; sets `reference`, `status`, `verification`, and timestamps itself, never accepting them from the browser; and records the chosen `stream` as text (not a foreign key), so a later stream retirement cannot orphan the row. The browser never writes directly.

### 9.5 Admin Writes

The Admin role's policies permit full management of content, admissions configuration, streams, submissions, and settings. Content rows may be deleted by an Admin. Admission submissions and contact messages **should be archived rather than deleted** as an office practice — a workflow convention, not a database-enforced prohibition. The one hard database rule in the admissions area is **retire-not-delete on streams** (Decision 5): the delete path on `management_streams` is not exposed, and retirement is a flag flip, so a stream's past applications are never silently rewritten.

### 9.6 The Service-Role Key

The privileged service-role key lives only in `lib/supabase/service.ts` — which begins with `import 'server-only'`, so any attempt to import it into client code becomes a build error rather than a silent browser leak — and in server routes. It bypasses all RLS and is used only *after* bot and permission checks. It is never exposed to the browser, never logged, and never committed (it exists only in environment variables).

### 9.7 Media Authorisation

Upload signing maps a stated purpose to a fixed server-side configuration — the browser cannot request that a private admission document be stored as public. The admission-document upload purpose is the one purpose open to anonymous callers and is rate-limited per IP; every public-content upload purpose additionally requires an active Admin session. Private-file viewing names a *submission*, not a file, and is restricted to Admins.

## 10. Shared Infrastructure

### 10.1 Session Handling

Middleware runs before every `/admin/:path*` and `/account/:path*` request, refreshes an expiring staff session, and redirects an unauthenticated or deactivated visitor to `/login`. It does not gate public pages and does not check role.

### 10.2 Email Link Handling

A route at `/auth/confirm` receives the links the system emails — staff password reset and staff invite/confirmation — validates the single-use token, establishes a session, and forwards onward. The email templates must point here rather than at their defaults. There is no signup-confirmation flow, because there is no public signup.

### 10.3 Media Handling

**Upload authorisation — `/api/media/sign-upload`.** The browser states a purpose (gallery photo, news image, achievement image, testimonial photo, faculty photo, download file, admission document) and nothing else. The server confirms the caller may use that purpose — public-content purposes require an active Admin session; the admission-document purpose is the one purpose open to anonymous callers and is rate-limited per IP — then maps the purpose to a fixed folder, format allow-list, size limit, and delivery type, signs that, and returns it. The browser never names the folder, filename, or delivery type.

**Viewing authorisation — `/api/media/sign-view`.** Admin-only. The request names a *submission*; the server reads that submission under the normal rules and, if it exists, returns a short-lived link for the document recorded on it. The browser never names a file directly.

**Uploads go browser-to-Cloudinary directly**, not through the application server. Accepted document types are **PDF and JPEG/PNG only**, capped at **8 MB** in the browser. PDF delivery has been enabled on the Cloudinary account. Orphaned files (uploaded, then the form abandoned) are swept by a monthly reconciliation.

### 10.4 Bot Protection

Applied on every public write path — admission submissions, the contact form, and the anonymous upload endpoint — as the invisible stack of Decision 7: honeypot, timing trap (generously tuned), and per-IP rate limiting. Fail-open with a flag (Decision 7a). No visible challenge to a real person at launch.

### 10.5 Content Freshness

Public pages are pre-rendered and cached for speed. Every Admin action that changes public content must explicitly refresh the affected pages — publishing a news post refreshes the news list and the homepage; adding a gallery album refreshes the gallery and homepage. Admin pages render fresh per request and need no such handling.

### 10.6 Link Previews & SEO

Every public page carries Open Graph tags (title, description, image) generated from its own content, falling back to the institution's logo and a standard description — so a shared link renders as an official-looking card rather than a bare URL. The site also generates a sitemap and a robots file permitting indexing. Both are generated automatically from existing content.

### 10.7 Data Export

Every staff list page — Submissions, Contact Messages, and each content list — carries an export-to-spreadsheet (CSV) action producing a file from what is on screen. Since these pages already load their rows into the browser, export is a client-side operation with no new endpoint.

### 10.8 Email Sending Configuration

The from-address is the environment variable `RESEND_FROM`. During development it is `onboarding@resend.dev` (works with no DNS, delivers only to the account owner's verified address — Decision 2). At go-live it flips to the verified subdomain address (for example `admissions@mail.modern.edu.np`) once the DNS records are in place (Section 31.5). Because it is an env var, the switch is one line and requires no code change. The office notification recipient is also configuration (`OFFICE_NOTIFICATION_EMAIL`), not hardcoded.

### 10.9 Environments & Configuration

- **Local development runs against the live cloud services.** There is no public deployment until go-live; the entire build, including the Phase 0 email milestone, is developed and proven locally with `npm run dev` talking to the live Supabase, Cloudinary, and Resend accounts. A public Vercel deployment is not required to prove any milestone before cutover.
- **Secrets live only in environment variables** — `.env.local` locally (git-ignored) and Vercel's environment settings at deploy time. `.env.example` (committed) lists the keys with empty values. Nothing sensitive is ever committed.
- **The repository is private** (Section 5), because the system handles applicant PII. This is defence in depth, not a substitute for the security model — the design is safe even if the code were public, but a client project keeps its repository private as a matter of course.
- **The spec and operating rules live in the repo:** this document at `/docs/Modern_College_PRD.md`, and the Claude Code operating discipline at `/CLAUDE.md`.

---

# PART III — PAGES AND ENDPOINTS

Each entry follows the same five-part structure. Rules established in Parts I and II are not repeated.

## 11. Homepage — `/`

1. **Route & Visibility.** Public.
2. **Experience.** Institutional hero and welcome; the Principal's message preview linking to About; a "Features" block (Computer Lab, Cafeteria, Sports, Scholarships, Classrooms, Library, Transportation); animated statistics (teachers, students, years) drawn from settings — showing real figures, unlike the current site's unfilled "0 +"; a programmes overview; a "News & Events" feed; a "Student's Voice" preview; a prominent **Apply Now** call-to-action; find-us map and contact block.
3. **Frontend.** Navigation and CTAs; stats animate on scroll. No forms except the CTA link.
4. **Backend.** Reads: latest published posts; active programmes; published testimonials (a few); the three statistics from settings.
5. **Security.** All reads public, published rows only.

**Homepage pop-up.** If `popup_is_active` is true, the homepage renders the uploaded banner in a dismissible modal (Decision 12). It appears a moment after the page paints rather than blocking initial render; it is dismissible and stays dismissed for a few days via a browser flag (cookie/localStorage); and it is mobile-first — the close control is easy to tap and the banner is expected to be portrait or square, not a wide desktop strip. If `popup_link_url` is set, the banner is clickable through to that address.

## 12. About Us — `/about`

Public. History and vision; Principal's and Chairman's messages; Executive Board, with anchor links. Static content in code (Decision 10). No data access.

## 13. Programmes Index — `/programmes`

Public. Published programmes as cards (Secondary, +2 Management, +2 Law, BBS), each linking to detail. One read of published programmes in display order.

## 14. Programme Detail — `/programmes/[slug]`

Public. Full programme page: introduction, curriculum/subject tables, activities, pedagogy, and the **faculty list** (Decision 9). Where admissions for this programme are open, a contextual Apply link. One read of the programme and its faculty rows. Published rows only.

## 15. Admission Procedure — `/admissions`

Public. The stable prose describing how admission works, alongside cards for each **currently published** admission form. If none is published, a clear "admissions are not currently open" state. One read of published `admission_forms`; the procedure prose is static.

## 16. Scholarships — `/scholarships`

Public. Published scholarship entries — title, description, criteria. One read in display order.

## 17. Learning Process — `/learning-process`

Public, static prose (Decision 10). No data access.

## 18. Student's Voice — `/students-voice`

Public. Published testimonials — student name, programme, quote, optional photo. One read in display order.

## 19. Achievements — `/achievements`

Public. Published achievements — title, description, image, date. One read.

## 20. Gallery — `/gallery` and Album — `/gallery/[slug]`

Public. Index: albums with cover, title, photo count. Album: a grid of photographs with optional captions, opening full-screen. Below-the-fold images lazy-load. Photographs served through a resizing transformation, stripping location metadata and protecting the quota (Decision 6).

## 21. News / Events / Notices — `/news` and Detail — `/news/[slug]`

Public. Published posts newest first, filterable by type and category, each with title, date, excerpt, cover image. Detail shows full body, optional cover, date, and a share action whose Open Graph tags make the shared link render as a card. Published rows only.

## 21.1 Admission Form — `/apply/[form]`

1. **Route & Visibility.** Public. Limited to the three fixed form ids; anything else is not found.
2. **Experience.** The form's editable heading and description, then its **code-fixed fields**. For **+2 Management**, a stream picker rendered from `management_streams` showing only available streams. If upload is enabled, one document upload (PDF/JPEG/PNG, ≤8 MB); if disabled, no upload appears. On success, a **reference number** and confirmation the office will be in touch.

   **Guard for an empty Management stream list.** If the Management form is published but has no available streams (the launch state until the in-charge fills the list), the form does **not** render an empty picker — it shows an "admissions opening soon" message, and the admin dashboard flags the condition (Decision 5).

3. **Frontend.** The invisible bot-protection stack is present (honeypot, render timestamp). If upload is enabled and a file is attached, the browser requests permission (Section 10.3) and uploads directly to Cloudinary, then submits the answers plus the file reference. Client-side validation is friendly and permissive — never block a real applicant over a formatting quibble.
4. **Backend.** The server route runs the bot checks (fail-open with flag), validates against the form's schema, records the chosen stream as text, sets reference/status/verification/timestamps, writes one submission row, and emails the office (Decision 8).
5. **Security.** No account required and none created. The browser cannot write directly; the document uses private delivery; the endpoint is rate-limited per IP.

## 22. Contact — `/contact`

Public. Address, phone numbers (tap-to-call), emails, social links, a find-us map, and a "Tell us what you think" message form. Same invisible bot-protection stack as admissions. The server route runs the checks, writes one `contact_messages` row, and emails the office. Browser cannot write directly; rate-limited per IP.

## 23. Downloads — `/downloads`

Public. Published downloadable resources (results, routines, forms, notices) grouped or filtered by category, each a titled link to the file. One read in display order. Public delivery.

## 24. Privacy — `/privacy`

Public, static prose (Decision 10). States what the site stores (admission enquiries and contact messages), that these are visible only to staff, that nothing submitted is published, that uploaded documents are stored privately, and how a person may request correction or removal.

## 25. Login — `/login`

1. **Route & Visibility.** Public; a signed-in Admin is redirected to `/admin`.
2. **Experience.** Email, password, submit; a password-reset link. A failed attempt shows an inline **generic** message ("Invalid email or password") without reloading — it does not reveal whether an email is registered.
3. **Frontend.** Submits to the server (a Server Action).
4. **Backend.** Signs the staff member in and redirects to `/admin`.
5. **Security.** There are no non-staff accounts to sign in. No profile is created here.

## 26. Password Reset — `/reset-password` and `/reset-password/update`

Staff password recovery via Supabase's built-in flow; the emailed link lands at `/auth/confirm` (Section 10.2), which validates the single-use token, establishes a session, and forwards to the change page. Security rests on the single-use, time-limited token. (Built after the login/session flow, before the contact-form milestone.)

## 27. Admin Landing — `/admin`

1. **Route & Visibility.** Admin.
2. **Experience.** Links into every module: News, Gallery, Programmes, Achievements, Testimonials, Scholarships, Downloads, Admissions, Submissions, Contact Messages, Settings, and Users. An attention summary: new submissions, unread contact messages, and any warning (for example, a published Management form with no available streams).
3. **Frontend.** No data changes here.
4. **Backend.** Counts for the summary.
5. **Security.** The admin layout's live role check (Section 9.2) redirects any non-active-admin before the page renders. Every module below independently enforces its own database policies.

## 28. Admin — Content Modules

News, Gallery, Programmes, Achievements, Testimonials, Scholarships, and Downloads share a structure and are described together. All are Admin-managed.

- **News — `/admin/news`.** Create, edit, delete, publish/unpublish posts (type, category, excerpt, body, cover image, public delivery). Manage the category list. Every change refreshes the news list and homepage.
- **Gallery — `/admin/gallery`.** Albums with covers; photos uploaded one at a time (a deliberate simplicity trade; multi-select can be added later as a pure frontend improvement). Captions and display order per photo.
- **Programmes — `/admin/programmes`.** Edit each programme's intro, body (curriculum/activity tables), and its **faculty rows** (add/edit/remove/reorder — the frequently-changing data, Decision 9). Publish/unpublish and reorder.
- **Achievements / Testimonials / Scholarships — `/admin/{...}`.** Standard create/edit/delete/publish with images where relevant (public delivery), and display order.
- **Downloads — `/admin/downloads`.** Upload files (public delivery), set title/description/category, publish/unpublish, reorder.

Each write records the acting user and refreshes affected public pages.

## 29. Admin — Admissions — `/admin/admissions`

1. **Route & Visibility.** Admin.
2. **Experience.** The three admission forms as manageable rows. For each: publish/unpublish, enable/disable upload, edit heading and description, set an optional (informational) deadline. A one-click **open/close +2 admissions** convenience toggles Management and Law together, while each stays independently reachable (so Law can close early — Decision 4). A **Management streams** panel: add a stream, reorder, and **retire** a stream (flag off — it leaves the picker but past submissions keep their label; no hard delete — Decision 5). The panel ships empty; a warning shows if the Management form is published with no available streams.
3. **Frontend.** Toggles and inline edits; retire is a visible, reversible flag.
4. **Backend.** Writes to `admission_forms` and `management_streams`; publishing refreshes the relevant public pages.
5. **Security.** Admin-only. The stream table exposes no delete path.

## 30. Admin — Submissions & Contact — `/admin/submissions`, `/admin/contact-messages`

1. **Route & Visibility.** Admin.
2. **Experience.** **Submissions:** every admission enquiry across the three forms, filterable by form, status, and stream, searchable by reference, exportable to CSV. Each shows applicant name/phone/email, the answers, the chosen stream, the private document link if present, the verification flag (an `unverified_review` row is obvious and dismissable in seconds — Decision 7a), and the triage status, which staff advance (New → Reviewed → Contacted → Enrolled → Archived). **Contact messages:** name, email, message, status (New → Read → Archived), searchable, exportable.
3. **Frontend.** Document viewing follows Section 10.3 — name the submission, receive a short-lived link. Status changes are inline.
4. **Backend.** One read of all submissions/messages (no ownership — these are staff-only leads). Status changes write status and `updated_at`.
5. **Security.** Admin-only. Private documents are reachable only through the admin-only sign-view path. Archiving rather than deleting is the office convention.

### 30.1 Admin — Settings & Users — `/admin/settings`, `/admin/users`

- **Settings.** Edit homepage statistics (teachers, students, years), the office notification email address(es), and site-wide toggles, and the homepage pop-up: upload/replace the banner (public delivery via the signed-upload path), set an optional click-through URL, and toggle it on or off. Turning it off is the only "dismiss for everyone" control. Admin-only.
- **Users.** All staff accounts with name, email, role, active status, and creation date. Add a new Admin (sending an invite/confirmation via Resend, landing at `/auth/confirm`), and deactivate/reactivate accounts. An Admin cannot deactivate their own account or remove their own admin status. This is the sole mechanism by which staff access is granted, so it is Admin-only at both the layout and database layers (the admin-edits-anyone policy on `profiles`, Section 9.2), and a role/active change takes effect on the affected account's next action.

### 30.2 My Account — `/account`

Any signed-in staff member edits their own name and changes their password (email is shown but not edited here). The database rule restricts every account to its own profile row and never to the `role` or `is_active` fields, which are reachable only through Users.

---

# PART IV — DELIVERY

## 31. Operations

### 31.1 Backups — Required Before Launch

The free database tier has no automated backups and pauses after inactivity (Decision 11). Recommended: the paid tier (daily backups, no pausing). Minimum acceptable: a scheduled export, tested by actually restoring it once, with a stated acceptable-loss window. An untested backup is not a backup.

### 31.2 Service Limits

| Service | Free Limit | Assessment |
| --- | --- | --- |
| Resend | 3,000/month, 100/day | Sufficient for staff auth + office notifications |
| Cloudinary | 25 credits/month | Sufficient only with transformed delivery (Decision 6). Monitor monthly |
| Supabase (free) | 500 MB, generous MAU | Storage ample. Backups and pausing are the constraint, not capacity |
| Vercel | Hobby/Pro tier | Confirm the tier meets the institution's traffic and custom-domain needs |

### 31.3 Monitoring

Before launch: error reporting on the live site; a monthly Cloudinary quota check; a monthly reconciliation of orphaned uploads; and, during admission season, a periodic check that submission email notifications are actually arriving. A silently broken notification during season is the highest-cost failure this site has, because it loses leads invisibly — test it, and re-test it when the season opens.

### 31.4 Handover

Required before launch: written credential custody (domain, DNS, Supabase, Cloudinary, Resend, Vercel, GitHub), a documented deployment process, this document kept current in `/docs`, and at least two people at the institution who know how to reach the developer.

### 31.5 Go-Live: Domain, DNS & Email Cutover

The site is developed against the live cloud services with no public deployment (Section 10.9); go-live is a deliberate, sequenced cutover, not a gradual reveal. The current domain (`modern.edu.np`) is registered at Register.com.np (Mercantile) with DNS served by the outgoing host's cPanel (Prabhu Host), whose subscription ends in roughly six months. The plan is to move the domain onto **Vercel's nameservers** (`ns1.vercel-dns.com`, `ns2.vercel-dns.com`), which is sensible precisely because the old cPanel zone is being abandoned anyway.

Moving nameservers makes Vercel authoritative for the **entire** domain, starting from an empty zone. Anything not recreated in Vercel DNS goes dark at the moment of the switch. The cutover sequence, in order:

1. **Inventory the current zone first.** Before touching nameservers, record every existing DNS record in cPanel — in particular the **MX records and any SPF/TXT records for the existing `@modern.edu.np` email**. This is the single most forgettable step and the one that breaks college email if missed.
2. **Resolve where email will live after cutover.** The existing mailboxes (e.g. `info@modern.edu.np`) are hosted on the outgoing cPanel and will stop working when that subscription ends. A decision is required (Section 33): most naturally, move mailboxes to **Google Workspace** using the institution's new Google account, or to another provider. Whatever is chosen dictates which MX records are recreated in Vercel DNS.
3. **Deploy the finished site to Vercel** and add the production environment variables there (all Supabase/Cloudinary/Resend keys, and `RESEND_FROM` still pointing at the onboarding domain for the moment).
4. **Switch nameservers** at Register.com.np to Vercel's, and add the custom domain in Vercel (Vercel then manages the apex automatically, with automatic SSL).
5. **Recreate records in Vercel DNS:** the email MX/SPF records from step 1/2, and the **Resend sending-domain records** for `mail.modern.edu.np` (DKIM, SPF, and optional DMARC — the DKIM TXT on `resend._domainkey.mail`, the MX and SPF on `send.mail`).
6. **Verify the Resend domain**, then **flip `RESEND_FROM`** from `onboarding@resend.dev` to the verified address (e.g. `admissions@mail.modern.edu.np`) — a one-line environment change.
7. **Confirm end to end:** the live site loads on the domain; a test admission submission emails the office from the verified address; existing/relocated mailboxes send and receive.

Until this cutover, all development email uses the Resend onboarding domain, which requires no DNS and delivers to the developer's verified address (Decision 2) — so every email-dependent milestone is provable before any DNS is touched.

## 32. Build Sequence

The riskiest surface — admissions, with anonymous signed uploads, private delivery, dynamic streams, generated references, and the submission pipeline — is built last, after every technique it needs is proven in cheaper form.

**Phase 0 — Foundation.** *In progress.* The scaffold is complete (Next.js 16 App Router, TypeScript, Tailwind v4; the `lib/supabase` client/server/service split with the service key isolated to `server-only`; middleware gating `/admin` and `/account`; the full placeholder route tree). Remaining Phase 0 work: the `profiles` table and `current_user_is_active_admin()` function with RLS; seeding the first admin by hand; staff login, session, and logout with the live role check; then password reset and `/auth/confirm`; and finally the **contact form** as the first end-to-end public write. **Definition of done:** a stranger on their own phone can send a contact message that lands in the admin list and emails the office (via the Resend onboarding domain), and staff can sign in and reset a password unaided. Prove this before proceeding — everything downstream reuses this exact pattern.

**Phase 1 — Public shell & content CMS.** Homepage, static pages (About, Learning Process, Admission Procedure prose, Privacy), News, Gallery, and the admin shell for those. Establishes the design system, content refresh, Open Graph, and SEO — with no sensitive data anywhere, and the single-image homepage pop-up (Decision 12).

**Phase 2 — Remaining content modules.** Programmes (with faculty rows), Achievements, Testimonials, Scholarships, Downloads, homepage statistics, Settings, Users. Mostly familiar work over proven patterns.

**Phase 3 — Admissions.** The three forms, the dynamic Management stream list with its empty-state guard, the upload toggle, the submission pipeline with triage status and office email, and CSV export. Highest value, built when the write/upload/bot patterns are already solid.

**Go-live.** The DNS/email cutover (Section 31.5), once the institution has signed off on content and the pre-launch decisions in Section 33 are closed.

If time runs short, the lowest-cost things to defer are additive, not load-bearing: CSV export and any richer submission-history tracking. Neither touches the core promise that a real applicant is never turned away.

## 33. Decisions Required From the Institution

The document is complete except for the following. Items resolved since Revision 1 are marked ✓.

**Resolved during the build kickoff:**
- ✓ **First admin account** — the developer's own email is seeded first to prove the flow; the real `@modern.edu.np` administrators are added from the Users page afterward.
- ✓ **Language & dates** — English-only, Gregorian (Decision 3).
- ✓ **Bot protection approach** — invisible stack, no visible challenge at launch (Decision 7).
- ✓ **Development email** — Resend onboarding domain during the build; verified subdomain at go-live (Decision 2).

**Required before Phase 3 (Admissions):**
1. **The exact fields for each of the three admission forms** (+2 Management, +2 Law, BBS). Placeholders based on the current site's forms stand in until confirmed.
2. **The initial Management stream list** — ships empty by design; the admission in-charge fills it (Decision 5), so it need not be final before build.
3. **The office notification email address(es)** for new-submission alerts.

**Required before go-live:**
4. **Backups** — fund the paid tier or approve a tested scheduled export with a stated acceptable-loss window (Decision 11).
5. **Post-cutover email hosting** — where `@modern.edu.np` mailboxes live once the outgoing cPanel ends (Google Workspace via the new Google account is the natural path). Determines the MX records recreated in Vercel DNS (Section 31.5).
6. **Content migration** — which pages/content copy over from the current WordPress site (news posts, gallery images, faculty lists) and which start fresh.
7. **Privacy page content** — confirm Section 24's statement is accurate and acceptable.
8. **Homepage statistics** — the exact numbers for teachers, students, and years.

**Required before Phase 1:**
9. **Static content** — final copy for About Us (Principal's and Chairman's messages, Executive Board), Learning Process, Admission Procedure, and Contact details.
10. **Design direction** — brand colours, typography, and hero imagery for the redesign (the team holds full creative authority here).

## 34. Closing Note

This site is simpler than an accountability system, and deliberately so — it holds no public record that must be defended against its own operators, so it carries none of that machinery. But it has one promise it must keep without exception: **the institution must never lose a real applicant to friction or to a technical failure.**

Every decision that touched a form was settled in that promise's favour — the invisible bot stack over a visible challenge, fail-open over fail-closed, a generous timing trap, permissive client validation, and a monitored notification path. A prospective student who fills the form should reach the office every time; a bot that slips through costs a staff member two seconds. That asymmetry is the whole design, and it is the right way round.

The second thing worth defending: the deliberate boundary that keeps this a marketing site and pushes any future account-holding service onto its own subdomain. It costs a little ambition now — no portal, no logins — and buys a great deal of safety and simplicity. The current site's compromise was not bad luck; it was the predictable result of an ageing, plugin-heavy setup that advertised its own software and was hard to keep patched. This build is designed to avoid that whole class of problem from the first commit: one clean custom system, a read-only public, secrets that live only on the server, and a repository kept private not because the design needs secrecy but because a client's data deserves the care.
