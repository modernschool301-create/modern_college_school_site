import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

// Typed access to the settings key/value store (PRD 8.4). Server-only: every
// caller is a Server Component or Server Action, and `office_notification_email`
// must never be bundled anywhere a browser could reach.
//
// ┌─ WHICH CLIENT READS WHAT ─────────────────────────────────────────────────┐
// │ The store is MIXED — public display values plus the office inbox address  │
// │ — and the anon SELECT policy is an allowlist of the public keys (see the  │
// │ migration). That policy is the real enforcement; these helpers simply     │
// │ pick the right client for the job:                                        │
// │                                                                           │
// │   getSettings()      normal server client. On a public page it runs as    │
// │                      anon and RLS returns ONLY the allowlisted keys —     │
// │                      office_notification_email is absent from the result, │
// │                      not blanked out. Signed in as an active admin the    │
// │                      same call returns everything.                        │
// │   getOfficeNotificationEmail()                                            │
// │                      service client, because its one caller is the PUBLIC │
// │                      contact action, which is already service-role and    │
// │                      has no admin session to read with.                   │
// │                                                                           │
// │ A public page calling getSettings() therefore cannot leak the address     │
// │ even if it asked for it — there is no code path where it needs to.        │
// └───────────────────────────────────────────────────────────────────────────┘

// The fixed key set, as seeded by the migration. New keys arrive by migration
// alongside the code that reads them — there is no INSERT policy.
export const SETTING_KEYS = [
  'stat_teachers',
  'stat_students',
  'stat_years',
  'office_notification_email',
  'popup_image',
  'popup_is_active',
  'popup_link_url',
  'popup_alt_text',
] as const;

export type SettingKey = (typeof SETTING_KEYS)[number];

// Every key present, so callers never branch on undefined. A key RLS withheld
// (or one not yet seeded) reads as an empty string — indistinguishable from
// "not configured", which is the correct reading for a public page either way.
export type Settings = Record<SettingKey, string>;

function emptySettings(): Settings {
  return Object.fromEntries(SETTING_KEYS.map((k) => [k, ''])) as Settings;
}

function toSettings(rows: { key: string; value: string | null }[]): Settings {
  const settings = emptySettings();
  for (const row of rows) {
    if ((SETTING_KEYS as readonly string[]).includes(row.key)) {
      settings[row.key as SettingKey] = row.value ?? '';
    }
  }
  return settings;
}

/**
 * The whole store, keyed. Runs as whoever the caller is: anon on a public page
 * (allowlisted keys only), the full set for an active admin.
 *
 * A failed read returns defaults rather than throwing — the homepage must render
 * with fallback figures if the settings read fails, never 500.
 */
export async function getSettings(): Promise<Settings> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('settings').select('key, value');

  if (error) {
    console.error('[settings] read failed', error);
    return emptySettings();
  }
  return toSettings((data ?? []) as { key: string; value: string | null }[]);
}

// ---------------------------------------------------------------------------
// The pop-up group (Decision 12)
// ---------------------------------------------------------------------------

export type PopupSettings = {
  // True only for the exact string 'true'. The store is all text, so a stray
  // value ('1', 'yes', '') reads as OFF — an announcement must never appear
  // because a value was ambiguous.
  isActive: boolean;
  image: string; // Cloudinary public ID; '' when none is set
  linkUrl: string;
  altText: string;
};

export function popupFromSettings(settings: Settings): PopupSettings {
  return {
    isActive: settings.popup_is_active === 'true',
    image: settings.popup_image,
    linkUrl: settings.popup_link_url,
    altText: settings.popup_alt_text,
  };
}

// ---------------------------------------------------------------------------
// Homepage statistics (PRD 11)
// ---------------------------------------------------------------------------

// Displayed VERBATIM: the value carries its own suffix ('30+', '1,200+'), so
// the page never appends one. A blank setting means "not configured" and the
// caller falls back to the figure in the code rather than rendering an empty
// stat — the current site's unfilled "0 +" is exactly what PRD 11 is reacting
// to.
export function statOrFallback(value: string, fallback: string): string {
  const trimmed = value.trim();
  return trimmed || fallback;
}

// ---------------------------------------------------------------------------
// The office notification address
// ---------------------------------------------------------------------------

/**
 * The address office notifications go to: the SETTING when one is configured,
 * otherwise the OFFICE_NOTIFICATION_EMAIL env var.
 *
 * Env is the fallback, not the other way round, so the office can change where
 * mail lands without a redeploy — but a blank or unreadable setting can never
 * silence notifications that were working before this module existed. A thrown
 * read falls back too: losing a lead's notification is the costliest failure in
 * the system (PRD 31.3), so this path fails to the previous behaviour, never to
 * nothing.
 *
 * Service-role: the caller is the public contact action, which has no session.
 */
export async function getOfficeNotificationEmail(): Promise<string | undefined> {
  const fallback = process.env.OFFICE_NOTIFICATION_EMAIL || undefined;

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'office_notification_email')
      .single();

    if (error) {
      console.error('[settings] office email read failed', error);
      return fallback;
    }
    const configured = String(data?.value ?? '').trim();
    return configured || fallback;
  } catch (err) {
    console.error('[settings] office email read threw', err);
    return fallback;
  }
}
