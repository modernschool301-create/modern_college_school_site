'use client';

import { useActionState } from 'react';
import { cloudinaryImage } from '@/lib/cloudinary-url';
import { ImageUploadField } from '@/components/admin/image-upload-field';
import {
  saveStatistics,
  saveNotifications,
  savePopup,
  type SettingsFormState,
} from '@/app/admin/settings/actions';

// The three groups on /admin/settings, each its own form posting to its own
// action. Grouped by what an admin is trying to DO, not by what the store looks
// like — the store is a flat key/value table, which is not a useful shape to
// present to someone who wants to change a phone-number-sized fact.

const inputClass = 'w-full px-3 py-2 text-sm';
const initialState: SettingsFormState = { error: null, saved: false };

function FormFeedback({ state }: { state: SettingsFormState }) {
  if (state.error) {
    return (
      <p role="alert" className="text-sm text-danger">
        {state.error}
      </p>
    );
  }
  if (state.saved) {
    return (
      <p role="status" className="text-sm text-green-brand">
        Saved.
      </p>
    );
  }
  return null;
}

function SectionHeading({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <h2 className="font-display text-h3 text-green-ink">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">{children}</p>
    </>
  );
}

export function StatisticsSection({
  statTeachers,
  statStudents,
  statYears,
}: {
  statTeachers: string;
  statStudents: string;
  statYears: string;
}) {
  const [state, formAction, pending] = useActionState(
    saveStatistics,
    initialState,
  );

  return (
    <section>
      <SectionHeading title="Homepage statistics">
        The three counters under the hero. Type the figure exactly as it should
        appear, including any <strong>+</strong> or comma — &ldquo;30+&rdquo;,
        &ldquo;1,200+&rdquo;. Leave one blank to keep the figure currently built
        into the page rather than showing an empty stat.
      </SectionHeading>

      <form action={formAction} className="mt-4 max-w-2xl space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label htmlFor="stat_years" className="block text-sm font-medium">
              Years of teaching
            </label>
            <input
              id="stat_years"
              name="stat_years"
              defaultValue={statYears}
              placeholder="30+"
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="stat_students" className="block text-sm font-medium">
              Students
            </label>
            <input
              id="stat_students"
              name="stat_students"
              defaultValue={statStudents}
              placeholder="1,200+"
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="stat_teachers" className="block text-sm font-medium">
              Teachers
            </label>
            <input
              id="stat_teachers"
              name="stat_teachers"
              defaultValue={statTeachers}
              placeholder="60+"
              className={inputClass}
            />
          </div>
        </div>

        <FormFeedback state={state} />

        <button type="submit" disabled={pending} className="btn-primary text-sm">
          {pending ? 'Saving…' : 'Save statistics'}
        </button>
      </form>
    </section>
  );
}

export function NotificationsSection({
  officeEmail,
}: {
  officeEmail: string;
}) {
  const [state, formAction, pending] = useActionState(
    saveNotifications,
    initialState,
  );

  return (
    <section>
      <SectionHeading title="Notifications">
        Where contact-form messages are announced. This address is never shown on
        the public site.
      </SectionHeading>

      <form action={formAction} className="mt-4 max-w-2xl space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="office_notification_email"
            className="block text-sm font-medium"
          >
            Office notification email
          </label>
          <input
            id="office_notification_email"
            name="office_notification_email"
            type="email"
            defaultValue={officeEmail}
            placeholder="office@example.com"
            aria-describedby="office-email-hint"
            className={inputClass}
          />
          <p id="office-email-hint" className="text-small text-ink-muted">
            Leaving this blank does not switch notifications off. The address
            configured on the server (the{' '}
            <code className="font-mono">OFFICE_NOTIFICATION_EMAIL</code> setting)
            remains the fallback, so existing contact-form notifications keep
            working either way. Set an address here to override it without a
            redeployment.
          </p>
        </div>

        <FormFeedback state={state} />

        <button type="submit" disabled={pending} className="btn-primary text-sm">
          {pending ? 'Saving…' : 'Save notification email'}
        </button>
      </form>
    </section>
  );
}

export function PopupSection({
  cloudName,
  popupImage,
  popupIsActive,
  popupLinkUrl,
  popupAltText,
}: {
  cloudName: string;
  popupImage: string;
  popupIsActive: boolean;
  popupLinkUrl: string;
  popupAltText: string;
}) {
  const [state, formAction, pending] = useActionState(savePopup, initialState);

  return (
    <section>
      <SectionHeading title="Homepage announcement">
        A single banner image shown in a dismissible pop-up on the homepage only.
        The school supplies the finished artwork — there is no text or layout to
        edit here. A portrait or square image works best; it is shown at its own
        proportions and is never cropped to a wide strip.
      </SectionHeading>

      <form action={formAction} className="mt-4 max-w-2xl space-y-5">
        {/* The current banner, at the size the pop-up shows it, so an admin can
            see WHICH announcement is live before changing anything. */}
        {popupImage ? (
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Currently uploaded</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cloudinaryImage(cloudName, popupImage, 'c_limit,w_640')}
              alt=""
              className="w-full max-w-xs rounded-md border border-line"
            />
          </div>
        ) : (
          <p className="text-sm text-ink-muted">
            No banner uploaded yet. The announcement cannot be turned on until
            there is one.
          </p>
        )}

        <ImageUploadField
          name="popup_image"
          purpose="popup-banner"
          cloudName={cloudName}
          initialPublicId={popupImage}
          label="Banner image"
        />

        <div className="space-y-1.5">
          <label htmlFor="popup_alt_text" className="block text-sm font-medium">
            Description of the image
          </label>
          <input
            id="popup_alt_text"
            name="popup_alt_text"
            defaultValue={popupAltText}
            placeholder="Admissions open for the 2026 intake"
            aria-describedby="popup-alt-hint"
            className={inputClass}
          />
          <p id="popup-alt-hint" className="text-small text-ink-muted">
            Read aloud to visitors using a screen reader, who cannot see the
            banner. Write what the banner SAYS, not what it looks like.
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="popup_link_url" className="block text-sm font-medium">
            Link <span className="text-ink-faint">(optional)</span>
          </label>
          <input
            id="popup_link_url"
            name="popup_link_url"
            defaultValue={popupLinkUrl}
            placeholder="/admissions"
            aria-describedby="popup-link-hint"
            className={inputClass}
          />
          <p id="popup-link-hint" className="text-small text-ink-muted">
            Where the banner leads when tapped. Use{' '}
            <code className="font-mono">/admissions</code> for a page on this
            site, or a full <code className="font-mono">https://</code> address.
            Leave blank for a banner that is not clickable.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              name="popup_is_active"
              defaultChecked={popupIsActive}
              aria-describedby="popup-active-hint"
              className="h-4 w-4"
            />
            Show this announcement on the homepage
          </label>
          <p id="popup-active-hint" className="text-small text-ink-muted">
            This is the only way to take an announcement down for everyone. A
            visitor who dismisses the pop-up only hides it on their own device,
            for a few days — turning this off is what removes it from the site.
            Uploading a different banner shows the new one to everybody again,
            including people who dismissed the last one.
          </p>
        </div>

        <FormFeedback state={state} />

        <button type="submit" disabled={pending} className="btn-primary text-sm">
          {pending ? 'Saving…' : 'Save announcement'}
        </button>
      </form>
    </section>
  );
}
