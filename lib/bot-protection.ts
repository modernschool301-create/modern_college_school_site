import 'server-only';

// ============================================================================
// Invisible bot-protection stack (PRD Decision 7 / Section 10.4).
//
// Reused by every public write path — the contact form now, admission
// submissions later. The whole cost of a bot slipping through is one junk row
// in a staff-reviewed inbox, so the bar is "keep the inbox usable" — NOT "stop
// every bot." The overriding rule is that a real applicant must NEVER be turned
// away (PRD 1, 34).
//
// FAIL-OPEN WITH FLAG (Decision 7a): only two things are hard rejects — a
// filled honeypot and a clearly-too-fast submit. Everything ambiguous (missing
// IP, unreadable timestamp, rate-limit uncertainty) ACCEPTS the row tagged
// `unverified_review` rather than dropping a possible real lead.
// ============================================================================

export type BotVerdict =
  // A clear bot signal. Write nothing; show the user a generic error.
  | { outcome: 'reject' }
  // Accept the submission and store it as 'verified'.
  | { outcome: 'accept'; verification: 'verified' }
  // Ambiguous — accept, but flag for a two-second staff glance (fail-open).
  | { outcome: 'accept'; verification: 'unverified_review' };

// Submissions faster than this from form render are treated as automated.
// Tuned GENEROUSLY on purpose: a real person cannot fill name + email +
// message in under two seconds, but we would rather let a fast typist through
// than reject one real lead. Raising this risks real users; do not.
const MIN_ELAPSED_MS = 2000;

// Rate limit: a handful of submissions per IP per window. A real visitor sends
// one or two messages; this only bites obvious floods.
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

// ---------------------------------------------------------------------------
// 1. Honeypot — a decoy field hidden from humans (see the /contact form). A
// naive bot fills every field; a real person never sees it. Filled => reject.
// ---------------------------------------------------------------------------
export function honeypotFilled(value: FormDataEntryValue | null): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

// ---------------------------------------------------------------------------
// 2. Timing trap. The form embeds the render time; we check elapsed time.
// Returns:
//   'too_fast'   -> hard reject (clearly automated)
//   'ok'         -> plausible human timing
//   'unreadable' -> AMBIGUOUS: missing/garbled/future timestamp => fail open
// ---------------------------------------------------------------------------
export function checkTiming(
  renderedAtRaw: FormDataEntryValue | null,
): 'too_fast' | 'ok' | 'unreadable' {
  const renderedAt = Number(renderedAtRaw);
  if (!renderedAtRaw || !Number.isFinite(renderedAt)) {
    return 'unreadable';
  }
  const elapsed = Date.now() - renderedAt;
  // Negative elapsed (clock skew / tampered future timestamp) is not a
  // confident bot signal, so treat it as ambiguous rather than rejecting.
  if (elapsed < 0) {
    return 'unreadable';
  }
  return elapsed < MIN_ELAPSED_MS ? 'too_fast' : 'ok';
}

// ---------------------------------------------------------------------------
// 3. Per-IP rate limiting.
//
// TODO(production): this in-memory map is per-instance and resets on cold
// start — fine for local dev, but serverless instances do NOT share memory, so
// on Vercel it must move to a shared store (e.g. Upstash Redis) before launch.
// This is the one bot measure that also guards the anonymous Cloudinary upload
// endpoint later (PRD Decision 7), so getting a shared limiter in place is
// load-bearing for admissions.
// ---------------------------------------------------------------------------
const ipHits = new Map<string, number[]>();

export function rateLimitOk(ip: string | null): boolean {
  // Missing IP is AMBIGUOUS, not a bot signal — never reject on it. The caller
  // treats a false return as "flag", never as a hard reject (see fail-open).
  if (!ip) {
    return false;
  }
  const now = Date.now();
  const recent = (ipHits.get(ip) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );
  if (recent.length >= RATE_LIMIT_MAX) {
    ipHits.set(ip, recent); // keep the window pruned
    return false;
  }
  recent.push(now);
  ipHits.set(ip, recent);
  return true;
}

// ---------------------------------------------------------------------------
// Read the client IP from proxy headers. On Vercel/Next the real client IP is
// the first entry of `x-forwarded-for`; fall back to `x-real-ip`.
// ---------------------------------------------------------------------------
export function clientIpFromHeaders(headers: Headers): string | null {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) {
      return first;
    }
  }
  return headers.get('x-real-ip');
}

// ---------------------------------------------------------------------------
// Combine the three checks into one verdict, applying the fail-open rule.
// ---------------------------------------------------------------------------
export function evaluateSubmission(input: {
  honeypot: FormDataEntryValue | null;
  renderedAt: FormDataEntryValue | null;
  ip: string | null;
}): BotVerdict {
  // Hard reject #1: honeypot filled — the single most reliable bot tell.
  if (honeypotFilled(input.honeypot)) {
    return { outcome: 'reject' };
  }

  // Hard reject #2: submitted implausibly fast.
  const timing = checkTiming(input.renderedAt);
  if (timing === 'too_fast') {
    return { outcome: 'reject' };
  }

  // Everything else is accept-or-flag. Any ambiguity (unreadable timing, or a
  // rate-limit trip / missing IP) flags for review instead of dropping.
  const flagged = timing === 'unreadable' || !rateLimitOk(input.ip);

  return {
    outcome: 'accept',
    verification: flagged ? 'unverified_review' : 'verified',
  };
}
