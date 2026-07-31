import { getSettings, popupFromSettings } from '@/lib/settings';
import {
  StatisticsSection,
  NotificationsSection,
  PopupSection,
} from '@/components/admin/settings/settings-sections';

// Settings (PRD 30.1). One page, three groups: the homepage statistics, the
// office notification address, and the homepage announcement (Decision 12).
//
// This read runs with the admin's own session, so RLS returns the FULL key set
// including office_notification_email. The same getSettings() call on a public
// page runs as anon and returns only the allowlisted keys — the difference is
// enforced by the policy, not by anything here.
export default async function AdminSettingsPage() {
  const settings = await getSettings();
  const popup = popupFromSettings(settings);
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? '';

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="font-display text-h2 text-green-ink">Settings</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">
        Site-wide values used by the homepage and by the office. Each group saves
        on its own.
      </p>

      <div className="mt-10">
        <StatisticsSection
          statTeachers={settings.stat_teachers}
          statStudents={settings.stat_students}
          statYears={settings.stat_years}
        />
      </div>

      <hr className="mt-12 border-line" />

      <div className="mt-12">
        <NotificationsSection officeEmail={settings.office_notification_email} />
      </div>

      <hr className="mt-12 border-line" />

      <div className="mt-12">
        <PopupSection
          cloudName={cloudName}
          popupImage={popup.image}
          popupIsActive={popup.isActive}
          popupLinkUrl={popup.linkUrl}
          popupAltText={popup.altText}
        />
      </div>
    </main>
  );
}
