# CLAUDE.md — Modern College & School Website

Operating instructions for Claude Code on this project. Read this and the
spec before making changes.

## The spec
The authoritative product & system spec is `/docs/Modern_College_PRD.md`.
Read it before proposing or changing any database schema, security policy,
route, or data flow. If a request seems to conflict with the PRD, stop and
flag the conflict rather than guessing. The PRD wins unless I explicitly
override it in the prompt.

## What this project is
A staff-managed marketing + admissions website for a college in Bhaktapur,
Nepal. Stack: Next.js (App Router, TypeScript) + Tailwind + Supabase
(Postgres/Auth) + Cloudinary (media) + Resend (email), deployed on Vercel.
It is NOT an accountability system and has none of that machinery.

## Non-negotiable security rules
1. **Two roles only: Guest (public, no account) and Admin.** There is NO
   public signup anywhere. Never add a signup route, a signup trigger on
   auth.users, or any path by which a visitor obtains an account. Admins are
   created only by other admins (or seeded by hand for the first one).

2. **The public can READ but never WRITE directly.** The Supabase anon key is
   read-only on published content. Every public submission (admission
   enquiry, contact message) goes through a server route/Server Action that
   holds the service-role key, runs bot checks FIRST, then writes. Never let
   the browser insert with the anon key.

3. **The service-role key is server-only, always.** It lives only in
   `lib/supabase/service.ts` (which starts with `import 'server-only'`) and
   in server routes. Never import it into a client component, never expose it
   to the browser, never log it. It bypasses all RLS.

4. **Enforcement reads the role LIVE from the database, never from the JWT/
   session.** A deactivated or demoted admin must lose access on their next
   action, not up to an hour later. Middleware checks session only; the admin
   layout checks active-admin status by reading `profiles` fresh.

5. **RLS is the real enforcement. Hiding a UI control is never a security
   measure.** Every restriction must have a matching database policy. If you
   hide a button, also state which policy makes the underlying attempt fail.

6. **Never weaken these to make something work.** If a feature seems to need a
   direct client write, an exposed service key, or a JWT role read, stop and
   ask — there is almost always a correct pattern instead.

## Data-integrity rules
- **Retire, never delete, Management streams.** Removing a stream flips an
  `is_available` flag; past submissions keep their stream label as text. No
  hard-delete path on that table. Same spirit: submissions/messages are
  archived, not deleted.
- **The server sets `reference`, `status`, `verification`, and all
  timestamps.** Never accept these from the browser.
- **Management stream list ships EMPTY.** A published Management form with no
  available streams must show an "opening soon" state, never a broken empty
  picker.

## Bot protection (per PRD Decision 7)
Invisible stack only: honeypot + timing trap + per-IP rate limiting. No
visible CAPTCHA/challenge widget at launch. **Fail open with a flag** — if a
check is ambiguous, accept the submission tagged `unverified_review`, never
drop it. Tune the timing trap generously; never risk a real applicant.
Rate-limit the anonymous media upload endpoint (Cloudinary quota protection).

## Media rules
- All uploads are signed; the SERVER decides delivery type by purpose, never
  the browser. Public: gallery, news, achievements, testimonials, faculty,
  downloads. Private (admin-only, short-lived signed view links): admission
  documents.
- Public images are served through a resizing transformation (strips GPS
  metadata, protects quota).
- Docs: PDF/JPEG/PNG only, 8 MB browser cap.

## Config that must stay as env vars (never hardcode)
- `RESEND_FROM` — currently `onboarding@resend.dev` for development; flips to
  the verified domain at cutover. Never hardcode a from-address.
- All Supabase/Cloudinary/Resend keys live in env, never in the repo.

## Working style
- Build only what the current prompt asks. Do not scaffold ahead or add
  "nice to have" features unprompted.
- For schema/policy changes, output the full SQL migration in your reply
  (not just a file) so I can review and run it myself.
- Prefer showing me actual output/policies over summarizing what you did.
- End substantial changes by confirming `npm run build` passes.

## Dates & language
English-only. Gregorian dates. No bilingual fields, no Bikram Sambat.
Timestamps stored timezone-aware, displayed in Nepal time (UTC+05:45).
