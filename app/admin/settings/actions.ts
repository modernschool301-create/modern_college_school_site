'use server';

import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireActiveAdmin } from '@/lib/auth-guard';
import type { SettingKey } from '@/lib/settings';

export type SettingsFormState = { error: string | null; saved: boolean };

// Generic message for DB failures. Raw Postgres text (e.g. "violates row-level
// security policy") is logged server-side, never surfaced to the browser.
const SAVE_FAILED = 'Something went wrong saving these settings. Please try again.';

// Three separate actions, one per section, rather than one save-everything
// action: an admin correcting a statistic should not have to re-submit the
// pop-up's fields, and a failure in one group should not roll back another.

// UPDATE only — never upsert. The key set is fixed by the migration and there is
// no INSERT policy, so an upsert against a mistyped key would fail at the
// database rather than quietly creating a row nothing reads. Values are written
// one key at a time; `updated_at` is maintained by the trigger, never sent.
async function writeSettings(
  supabase: SupabaseClient,
  entries: Partial<Record<SettingKey, string>>,
): Promise<boolean> {
  for (const [key, value] of Object.entries(entries)) {
    const { error } = await supabase
      .from('settings')
      .update({ value })
      .eq('key', key);
    if (error) {
      console.error(`[settings] update failed for ${key}`, error);
      return false;
    }
  }
  return true;
}

// Both the statistics and the pop-up render on the homepage, so every action
// here refreshes it. Nothing else reads settings today.
function revalidateHome() {
  revalidatePath('/');
}

export async function saveStatistics(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const { supabase } = await requireActiveAdmin();

  // Free text, deliberately: the value is displayed verbatim and carries its own
  // suffix ('30+', '1,200+'). No numeric parsing here — the homepage decides how
  // to animate it, and a blank value falls back to the figure in the code.
  const ok = await writeSettings(supabase, {
    stat_teachers: String(formData.get('stat_teachers') ?? '').trim(),
    stat_students: String(formData.get('stat_students') ?? '').trim(),
    stat_years: String(formData.get('stat_years') ?? '').trim(),
  });
  if (!ok) return { error: SAVE_FAILED, saved: false };

  revalidateHome();
  return { error: null, saved: true };
}

export async function saveNotifications(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const { supabase } = await requireActiveAdmin();

  const email = String(formData.get('office_notification_email') ?? '').trim();

  // Permissive shape check, and only when something was typed — BLANK IS VALID
  // and means "fall back to OFFICE_NOTIFICATION_EMAIL". Rejecting blank would
  // trap an admin who wants to hand the address back to the env var.
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Please enter a valid email address, or leave it blank.', saved: false };
  }

  const ok = await writeSettings(supabase, {
    office_notification_email: email,
  });
  if (!ok) return { error: SAVE_FAILED, saved: false };

  // Not a homepage value, but revalidating costs nothing and keeps every
  // settings action behaving the same way.
  revalidateHome();
  return { error: null, saved: true };
}

export async function savePopup(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const { supabase } = await requireActiveAdmin();

  const image = String(formData.get('popup_image') ?? '').trim();
  const linkUrl = String(formData.get('popup_link_url') ?? '').trim();
  const altText = String(formData.get('popup_alt_text') ?? '').trim();
  const isActive = formData.get('popup_is_active') === 'on';

  // An absolute http(s) address or a site-relative path. Anything else — a
  // `javascript:` URL above all — is refused: this value becomes the href of a
  // link shown to every visitor on the homepage.
  if (linkUrl && !/^(https?:\/\/|\/)/i.test(linkUrl)) {
    return {
      error:
        'The link must start with https:// or with / for a page on this site.',
      saved: false,
    };
  }

  // Turning the pop-up ON with no banner would publish an empty modal, so it is
  // refused here rather than rendering nothing and looking broken. (HomePopup
  // also renders null without an image — this is the message that explains why.)
  if (isActive && !image) {
    return {
      error: 'Upload a banner image before turning the announcement on.',
      saved: false,
    };
  }

  const ok = await writeSettings(supabase, {
    popup_image: image,
    popup_is_active: isActive ? 'true' : 'false',
    popup_link_url: linkUrl,
    popup_alt_text: altText,
  });
  if (!ok) return { error: SAVE_FAILED, saved: false };

  revalidateHome();
  return { error: null, saved: true };
}
