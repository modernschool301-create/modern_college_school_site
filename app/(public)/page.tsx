import { HeroNavMode } from '@/components/nav-hero-context';
import { Hero } from '@/components/home/hero';
import { LeadershipMessages } from '@/components/home/leadership-messages';
import { ThreeBenefits } from '@/components/home/three-benefits';
import { VoicePreview } from '@/components/home/voice-preview';
import { ProgrammesOverview } from '@/components/home/programmes-overview';
import { AchievementsPreview } from '@/components/home/achievements-preview';
import { FeaturesStrip } from '@/components/home/features-strip';
import { LocationMap } from '@/components/home/location-map';
import { NewsTeaser } from '@/components/home/news-teaser';
import { ClosingCTA } from '@/components/home/closing-cta';
import { StickyApplyCta } from '@/components/home/sticky-apply-cta';
import { HomePopup } from '@/components/home/home-popup';
import { cloudinaryImage, heroMedia } from '@/lib/cloudinary-url';
import { getSettings, popupFromSettings } from '@/lib/settings';

export default async function HomePage() {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME ?? '';

  // Built server-side: the (non-public) cloud name stays on the server; only the
  // resulting public delivery URLs reach the browser. Falls back cleanly to the
  // green-forest panel if the cloud name isn't configured.
  const media = heroMedia(
    cloud,
    process.env.NEXT_PUBLIC_HERO_VIDEO_ID ?? 'modern/hero',
  );

  // ONE settings read for both the statistics and the pop-up. This runs as anon,
  // so RLS returns only the allowlisted public keys — office_notification_email
  // is not in the result at all, not merely unused.
  const settings = await getSettings();
  const popup = popupFromSettings(settings);

  // c_limit is a BOUNDING BOX, not a crop: the banner is expected portrait or
  // square (PRD 11) and keeps its own proportions. A c_fill with an aspect ratio
  // would slice the school's finished artwork.
  const popupImageUrl = popup.image
    ? cloudinaryImage(cloud, popup.image, 'c_limit,w_800')
    : undefined;

  return (
    <>
      {/* Tell the nav this page owns a hero (starts transparent, solid on scroll). */}
      <HeroNavMode />

      {/* Story-first order: hero → the school's own voice → value prop + stats
          → what we offer → what students say → what's happening → the
          facilities behind it → closing CTA.

          Band tones alternate deliberately and NO two neighbours share one:
            Hero            forest  (not a Band; bg-green-forest)
            Leadership      mist
            ThreeBenefits   paper
            Programmes      mist
            Achievements    surface ← renders nothing at zero published rows,
                                      which puts mist next to paper: still
                                      distinct, so the sequence holds either way
            Voice           paper
            News            forest  ← the dark, contrasting break in the page
            Facilities      paper   ← clean and quiet after it
            LocationMap     mist
            ClosingCTA      forest
          Leadership renders NOTHING at zero published rows, which would put
          forest (hero) next to paper (benefits) — still distinct, so the
          sequence holds either way. */}
      <Hero media={media} />
      <LeadershipMessages />
      <ThreeBenefits
        statYears={settings.stat_years}
        statStudents={settings.stat_students}
        statTeachers={settings.stat_teachers}
      />
      <ProgrammesOverview />
      <AchievementsPreview />
      <VoicePreview />
      <NewsTeaser />
      <FeaturesStrip />
      <LocationMap />
      <ClosingCTA />

      {/* Mobile-only persistent Apply button. */}
      <StickyApplyCta />

      {/* Homepage announcement (PRD Decision 12) — HOMEPAGE ONLY, deliberately
          mounted here and nowhere else. Renders nothing unless an admin has
          both uploaded a banner and switched it on. */}
      <HomePopup
        active={popup.isActive}
        imageUrl={popupImageUrl}
        imageId={popup.image}
        linkUrl={popup.linkUrl || undefined}
        altText={popup.altText}
      />
    </>
  );
}
