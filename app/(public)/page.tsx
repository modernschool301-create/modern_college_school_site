import { HeroNavMode } from '@/components/nav-hero-context';
import { Hero } from '@/components/home/hero';
import { StatsBand } from '@/components/home/stats-band';
import { ProgrammesOverview } from '@/components/home/programmes-overview';
import { FeaturesStrip } from '@/components/home/features-strip';
import { NewsTeaser } from '@/components/home/news-teaser';
import { VoicePreview } from '@/components/home/voice-preview';
import { ClosingCTA } from '@/components/home/closing-cta';
import { HomePopup } from '@/components/home/home-popup';
import { heroMedia } from '@/lib/cloudinary-url';

export default function HomePage() {
  // Built server-side: the (non-public) cloud name stays on the server; only the
  // resulting public delivery URLs reach the browser. Falls back cleanly to the
  // green-forest hero if the cloud name isn't configured.
  const media = heroMedia(
    process.env.CLOUDINARY_CLOUD_NAME ?? '',
    process.env.NEXT_PUBLIC_HERO_VIDEO_ID ?? 'modern/hero',
  );

  return (
    <>
      {/* Tell the nav this page owns a hero (starts transparent, solid on scroll). */}
      <HeroNavMode />

      <Hero media={media} />
      <StatsBand />
      <ProgrammesOverview />
      <FeaturesStrip />
      <NewsTeaser />
      <VoicePreview />
      <ClosingCTA />

      {/* Homepage pop-up shell (PRD Decision 12). Inert until the Settings
          module supplies popup_is_active + banner image/link/alt. TODO: wire
          these props from the settings store. */}
      <HomePopup active={false} />
    </>
  );
}
